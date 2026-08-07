import { getAuthToken } from "@/lib/auth-token";
import type { AssistantEvent } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// How long to wait for the *next* chunk before giving up on an otherwise-open connection. This
// mirrors the backend's own idle timeout — it's a backstop for the case where the connection
// itself (not the model call the backend is waiting on) silently drops, which the backend has
// no way to detect on its end.
const STREAM_IDLE_TIMEOUT_MS = 60_000;

// Server-Sent Events over a POST body needs a manual reader — the browser's EventSource API
// only supports GET requests without custom headers, which won't carry our bearer token.
async function* parseSseStream(response: Response): AsyncGenerator<AssistantEvent> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await withIdleTimeout(reader.read());
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const dataLine = block.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      try {
        yield JSON.parse(dataLine.slice("data: ".length)) as AssistantEvent;
      } catch (err) {
        // Ignore a malformed/partial chunk rather than killing the whole stream over it.
        console.warn("[assistant] failed to parse SSE data line", dataLine, err);
      }
    }
  }
}

function withIdleTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Adam didn't respond in time. Please try again.")),
      STREAM_IDLE_TIMEOUT_MS,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Lets Adam answer "find parking near me" directly instead of asking the user to share
// coordinates. This must never sit on the critical path of sending a message: on some
// platforms (e.g. Windows with OS-level Location Services off), `getCurrentPosition` doesn't
// fail fast — it hangs until its own `timeout` elapses before erroring — which would otherwise
// add that full delay in front of *every* chat send. So instead of awaiting a live fix per
// message, we keep a background-refreshed cache and read whatever's already there
// synchronously; the very first message of a session (before the first fix lands, if ever)
// just won't have a location yet, same as when it's unavailable entirely — Adam falls back to
// asking, and subsequent messages pick up the cached fix once it resolves.
let cachedLocation: { latitude: number; longitude: number } | undefined;
let locationRequestInFlight = false;

function refreshLocationInBackground(): void {
  if (locationRequestInFlight) return;
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
  locationRequestInFlight = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      cachedLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      locationRequestInFlight = false;
    },
    () => {
      locationRequestInFlight = false;
    },
    { timeout: 10_000, maximumAge: 5 * 60 * 1000 },
  );
}

// Used when Adam explicitly calls get_user_location and the graph is paused waiting on an
// answer — unlike the background refresh above, it's fine (expected, even) for this one to take
// a moment: the panel shows a spinner on the "Requesting your location…" activity line for the
// duration, so there's a visible reason to wait, rather than every message silently stalling.
function fetchLocationNow(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        cachedLocation = coords; // keep the passive cache warm too
        resolve(coords);
      },
      () => resolve(null),
      { timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

async function postForSse(path: string, body: unknown): Promise<AsyncGenerator<AssistantEvent>> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Assistant request failed (${response.status})`);
  }
  return parseSseStream(response);
}

// Resuming rebuilds the agent's system prompt from scratch server-side (see
// AssistantService#buildGraph) — without resending it, the prompt falls back to "timezone
// unknown" partway through a turn that already established it via the original chat message.
function currentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export const assistantApi = {
  // Timezone lets Adam convert clock times the user mentions ("8pm") to the correct UTC instant
  // instead of assuming UTC. Location lets it answer "find parking near me" without asking.
  chat: (message: string) => {
    refreshLocationInBackground(); // fire-and-forget — keeps the cache warm for next time
    return postForSse("/assistant/chat", {
      message,
      timezone: currentTimezone(),
      ...(cachedLocation && { latitude: cachedLocation.latitude, longitude: cachedLocation.longitude }),
    });
  },
  resume: (approved: boolean) =>
    postForSse("/assistant/chat/resume", { approved, timezone: currentTimezone() }),
  // Answers a pending get_user_location interrupt. `coords` is null when the user declined,
  // geolocation isn't supported, or the fix failed/timed out — sent as an empty body (plus
  // timezone) so the backend resumes with `null` rather than a stale/garbage coordinate pair.
  resumeLocation: (coords: { latitude: number; longitude: number } | null) =>
    postForSse("/assistant/chat/resume", { ...coords, timezone: currentTimezone() }),
  fetchLocationNow,
};
