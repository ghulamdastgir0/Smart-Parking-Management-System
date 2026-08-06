"use client";

import { Bot } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAssistantChat } from "@/features/assistant/hooks";
import { AssistantPanel } from "./assistant-panel";

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  // Owned here, not inside AssistantPanel — AssistantLauncher stays mounted for the whole
  // session (app-shell never remounts it), so closing/reopening the panel just toggles what's
  // rendered without losing the conversation. It only resets on an actual page reload, since
  // that's a fresh React tree (and it's in-memory only — nothing is persisted to storage).
  const chat = useAssistantChat();

  if (open) {
    return <AssistantPanel onClose={() => setOpen(false)} {...chat} />;
  }

  return (
    <Button
      size="icon-lg"
      onClick={() => setOpen(true)}
      aria-label="Open Adam, your assistant"
      className="fixed right-6 bottom-20 z-50 size-14 rounded-full shadow-lg lg:bottom-6"
    >
      <Bot className="size-6" />
    </Button>
  );
}
