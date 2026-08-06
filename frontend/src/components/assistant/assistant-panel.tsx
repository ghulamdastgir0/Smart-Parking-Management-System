"use client";

import { Bot, Check, Loader2, Send, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { useAssistantChat } from "@/features/assistant/hooks";
import { describeConfirmation } from "@/features/assistant/tool-labels";
import { cn } from "@/lib/utils";
import { MarkdownMessage } from "./markdown-message";

// Three-bounce-dot "Adam is thinking" indicator, shown between the user sending a message and
// the first token/tool_call event actually arriving — the tool-activity lines further down
// already carry their own spinner once something *is* happening.
function TypingDots() {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-muted px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

type AssistantChatState = ReturnType<typeof useAssistantChat>;

export function AssistantPanel({
  onClose,
  messages,
  isStreaming,
  pendingConfirmation,
  error,
  send,
  respondToConfirmation,
}: AssistantChatState & { onClose: () => void }) {
  const [draft, setDraft] = useState("");
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingConfirmation, isStreaming]);

  function handleSend() {
    if (!draft.trim() || isStreaming) return;
    send(draft);
    setDraft("");
  }

  const lastMessage = messages[messages.length - 1];
  // Waiting on the model with nothing to show yet — no tokens, no tool-activity line started.
  const showTypingDots =
    isStreaming &&
    (!lastMessage ||
      lastMessage.role === "user" ||
      (!lastMessage.text && !lastMessage.toolActivity?.length));

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-2xl",
        // Stay fullscreen for as long as BottomNav is visible (it only hides at `lg:`, same
        // breakpoint Sidebar takes over at) — switching to the floating card any earlier
        // leaves a gap that shows BottomNav/page content behind the panel.
        "lg:inset-auto lg:right-6 lg:bottom-6 lg:h-[32rem] lg:w-96 lg:rounded-xl",
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          <span className="font-heading text-sm font-semibold">Adam</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close assistant">
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-w-0 flex-col gap-4 p-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Hi, I&apos;m Adam. Ask me to find parking, book a slot, check your reservations, or
              answer a policy question — I can only do what your account is allowed to do.
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex min-w-0 items-start gap-2",
                message.role === "user" && "flex-row-reverse",
              )}
            >
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full",
                  message.role === "user"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                {message.role === "user" ? (
                  <User className="size-3.5" />
                ) : (
                  <Bot className="size-3.5" />
                )}
              </div>
              <div
                className={cn(
                  "min-w-0 max-w-[85%] space-y-1.5 overflow-hidden rounded-xl px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {message.toolActivity?.map((entry, index) => (
                  <p
                    key={index}
                    className={cn(
                      "flex items-center gap-1.5 text-xs italic",
                      message.role === "user"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {entry.done ? (
                      <Check className="size-3" />
                    ) : (
                      <Loader2 className="size-3 animate-spin" />
                    )}
                    {entry.label}
                  </p>
                ))}
                {message.text &&
                  (message.role === "assistant" ? (
                    <MarkdownMessage text={message.text} />
                  ) : (
                    <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
                  ))}
              </div>
            </div>
          ))}

          {showTypingDots && (
            <div className="flex items-start gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="size-3.5" />
              </div>
              <TypingDots />
            </div>
          )}

          {pendingConfirmation && (
            <div className="ml-8 space-y-2 rounded-xl border border-border bg-background p-3 text-sm">
              <p className="font-medium">
                {describeConfirmation(pendingConfirmation.tool, pendingConfirmation.args)}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => respondToConfirmation(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={() => respondToConfirmation(true)}>
                  <Check className="size-3.5" />
                  Approve
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <div ref={scrollEndRef} />
        </div>
      </ScrollArea>

      <div className="flex shrink-0 items-end gap-2 border-t border-border p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask Adam…"
          className="max-h-24 min-h-9 flex-1 resize-none py-1.5"
          disabled={isStreaming}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={isStreaming || !draft.trim()}
          aria-label="Send message"
        >
          {isStreaming ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
