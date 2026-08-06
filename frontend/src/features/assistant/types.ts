export interface AssistantTokenEvent {
  type: "token";
  text: string;
}

export interface AssistantToolCallEvent {
  type: "tool_call";
  name: string;
  args: unknown;
}

export interface AssistantToolResultEvent {
  type: "tool_result";
  name: string;
  result: string;
}

export interface AssistantConfirmationEvent {
  type: "confirmation_required";
  tool: string;
  description: string;
  args: unknown;
}

export interface AssistantDoneEvent {
  type: "done";
}

export interface AssistantErrorEvent {
  type: "error";
  message: string;
}

export type AssistantEvent =
  | AssistantTokenEvent
  | AssistantToolCallEvent
  | AssistantToolResultEvent
  | AssistantConfirmationEvent
  | AssistantDoneEvent
  | AssistantErrorEvent;

export interface ToolActivityEntry {
  name: string;
  label: string;
  done: boolean;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolActivity?: ToolActivityEntry[];
}

export interface PendingConfirmation {
  tool: string;
  description: string;
  args: unknown;
}
