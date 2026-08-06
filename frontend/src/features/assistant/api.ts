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
// coordinates. Never blocks/fails the chat send over this: resolves to undefined on missing
// support, a denied/unavailable permission, or a slow fix — the assistant just falls back to
// asking for a location itself in that case. `maximumAge` reuses a recent fix instead of hitting
// the GPS/network on every single message once the user has granted permission once.
function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | undefined> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(undefined),
      { timeout: 4000, maximumAge: 5 * 60 * 1000 },
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

export const assistantApi = {
  // Timezone lets Adam convert clock times the user mentions ("8pm") to the correct UTC instant
  // instead of assuming UTC. Location lets it answer "find parking near me" without asking.
  chat: async (message: string) => {
    const location = await getCurrentLocation();
    return postForSse("/assistant/chat", {
      message,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(location && { latitude: location.latitude, longitude: location.longitude }),
    });
  },
  resume: (approved: boolean) => postForSse("/assistant/chat/resume", { approved }),
};
