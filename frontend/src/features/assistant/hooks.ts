"use client";

import { useCallback, useRef, useState } from "react";
import { assistantApi } from "./api";
import { describeToolCall } from "./tool-labels";
import type {
  AssistantEvent,
  AssistantMessage,
  PendingConfirmation,
  ToolActivityEntry,
} from "./types";

// Not a module-level counter: that state resets on Fast Refresh/HMR while the component's
// `messages` state (holding previously-minted ids) survives it, producing duplicate keys.
function nextMessageId(): string {
  return `assistant-msg-${crypto.randomUUID()}`;
}

function markToolDone(
  activity: ToolActivityEntry[] | undefined,
  name: string,
): ToolActivityEntry[] | undefined {
  if (!activity) return activity;
  const index = activity.findIndex((entry) => entry.name === name && !entry.done);
  if (index === -1) return activity;
  return activity.map((entry, i) => (i === index ? { ...entry, done: true } : entry));
}

export function useAssistantChat() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  // Tracks which assistant bubble the current turn's tokens/status lines append to — reset to
  // null at the start of each turn so every turn gets its own bubble.
  const activeMessageId = useRef<string | null>(null);

  // `update` must be a pure function of the message it's given — this gets passed straight
  // through to a setState updater, which React (in Strict Mode, dev only) invokes twice to
  // surface accidental impurities. It previously decided create-vs-update *and* mutated
  // `activeMessageId.current` from inside that double-invoked updater: the throwaway first
  // call would mint an id and write it to the ref, so the second (actually committed) call
  // would see a non-null id, look for a message that was never really added, find nothing, and
  // silently return the old state untouched — dropping the entire rest of the turn with no
  // error. Reading/writing the ref now happens here, once, outside the setState callback.
  const appendToActiveMessage = useCallback(
    (update: (message: AssistantMessage) => AssistantMessage) => {
      const existingId = activeMessageId.current;
      if (existingId) {
        setMessages((prev) => prev.map((m) => (m.id === existingId ? update(m) : m)));
        return;
      }
      const newId = nextMessageId();
      activeMessageId.current = newId;
      setMessages((prev) => [...prev, update({ id: newId, role: "assistant", text: "" })]);
    },
    [],
  );

  const handleEvent = useCallback(
    (event: AssistantEvent) => {
      switch (event.type) {
        case "token":
          appendToActiveMessage((m) => ({ ...m, text: m.text + event.text }));
          break;
        case "tool_call":
          appendToActiveMessage((m) => ({
            ...m,
            toolActivity: [
              ...(m.toolActivity ?? []),
              { name: event.name, label: describeToolCall(event.name), done: false },
            ],
          }));
          break;
        case "tool_result":
          // Mark the earliest still-pending call for this tool as finished, so its status line
          // stops spinning once the model has actually gotten the result back — without this,
          // every tool-activity line spins forever even after the turn's final answer renders,
          // which reads as "it's still working" when the action already completed.
          appendToActiveMessage((m) => ({
            ...m,
            toolActivity: markToolDone(m.toolActivity, event.name),
          }));
          break;
        case "confirmation_required":
          setPendingConfirmation({
            tool: event.tool,
            description: event.description,
            args: event.args,
          });
          break;
        case "error":
          setError(event.message);
          break;
        case "done":
          break;
      }
    },
    [appendToActiveMessage],
  );

  const consume = useCallback(
    async (streamPromise: Promise<AsyncGenerator<AssistantEvent>>) => {
      activeMessageId.current = null;
      setIsStreaming(true);
      setError(null);
      try {
        const stream = await streamPromise;
        for await (const event of stream) {
          handleEvent(event);
        }
      } catch (err) {
        console.error("[assistant] stream consume failed", err);
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      } finally {
        setIsStreaming(false);
      }
    },
    [handleEvent],
  );

  const send = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || isStreaming) return;
      setMessages((prev) => [
        ...prev,
        { id: nextMessageId(), role: "user", text: trimmed },
      ]);
      void consume(assistantApi.chat(trimmed));
    },
    [consume, isStreaming],
  );

  const respondToConfirmation = useCallback(
    (approved: boolean) => {
      setPendingConfirmation(null);
      void consume(assistantApi.resume(approved));
    },
    [consume],
  );

  return {
    messages,
    isStreaming,
    pendingConfirmation,
    error,
    send,
    respondToConfirmation,
  };
}
