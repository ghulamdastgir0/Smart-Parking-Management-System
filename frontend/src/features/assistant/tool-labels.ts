// Human-readable status lines shown while the assistant is mid tool-call, keyed by the exact
// tool names registered in backend/src/modules/assistant/tools/*.ts.
const TOOL_LABELS: Record<string, string> = {
  find_nearby_parking_lots: "Searching nearby parking lots…",
  list_parking_lots: "Loading parking lots…",
  get_parking_lot: "Looking up parking lot…",
  list_parking_lot_floors: "Loading floors…",
  create_parking_lot: "Creating parking lot…",
  update_parking_lot: "Updating parking lot…",
  delete_parking_lot: "Deleting parking lot…",
  create_parking_floor: "Adding floor…",
  search_parking_slots: "Checking slot availability…",
  get_parking_slot: "Looking up slot…",
  update_slot_status: "Updating slot…",
  bulk_update_slot_status: "Updating slots…",
  list_my_reservations: "Loading your reservations…",
  get_reservation: "Looking up reservation…",
  list_lot_reservations: "Loading reservations…",
  book_parking_slot: "Booking your slot…",
  cancel_reservation: "Cancelling reservation…",
  check_in_via_qr: "Checking in…",
  check_out_via_qr: "Checking out…",
  get_my_profile: "Loading your profile…",
  get_my_payment_method: "Loading payment method…",
  list_all_users: "Loading users…",
  get_user: "Looking up user…",
  update_my_profile: "Updating your profile…",
  block_user: "Blocking user…",
  unblock_user: "Unblocking user…",
  update_user: "Updating user…",
  remove_manager: "Removing manager…",
  list_my_notifications: "Loading notifications…",
  mark_notifications_read: "Marking notifications as read…",
  search_company_policies: "Checking company policies…",
};

export function describeToolCall(name: string): string {
  return TOOL_LABELS[name] ?? `Using ${name}…`;
}

function friendlyStatus(status: unknown): string {
  if (status === "MAINTENANCE") return "unavailable";
  if (status === "AVAILABLE") return "available";
  return typeof status === "string" ? status.toLowerCase() : "updated";
}

function asRecord(args: unknown): Record<string, unknown> {
  return args && typeof args === "object" ? (args as Record<string, unknown>) : {};
}

function changedFieldsSummary(args: unknown, fields: [string, string][]): string {
  const record = asRecord(args);
  const parts = fields
    .filter(([key]) => record[key] !== undefined && record[key] !== "")
    .map(([key, label]) => `${label}: ${String(record[key])}`);
  return parts.length ? parts.join(", ") : "these details";
}

// Builds the question shown in the approval card. Deliberately never reads *Id/token fields
// out of `args` — end users shouldn't see internal database ids, only the plain-language
// consequence of the action they're being asked to approve.
const CONFIRMATION_PROMPTS: Record<string, (args: unknown) => string> = {
  create_parking_lot: () => "Create this new parking lot?",
  update_parking_lot: (args) =>
    `Save these changes to the parking lot (${changedFieldsSummary(args, [
      ["name", "name"],
      ["address", "address"],
      ["isActive", "active"],
    ])})?`,
  delete_parking_lot: () => "Delete this parking lot? This cannot be undone.",
  create_parking_floor: (args) =>
    `Add a floor${asRecord(args).name ? ` named "${asRecord(args).name}"` : ""} to this parking lot?`,
  update_slot_status: (args) => `Mark this parking slot as ${friendlyStatus(asRecord(args).status)}?`,
  bulk_update_slot_status: (args) => {
    const count = Array.isArray(asRecord(args).slotIds) ? (asRecord(args).slotIds as unknown[]).length : "these";
    return `Mark ${count} parking slot(s) as ${friendlyStatus(asRecord(args).status)}?`;
  },
  book_parking_slot: () => "Book this parking slot for the requested time?",
  cancel_reservation: () => "Cancel this reservation?",
  check_in_via_qr: () => "Check in this reservation?",
  check_out_via_qr: () => "Check out and charge this reservation?",
  update_my_profile: (args) =>
    `Update your profile (${changedFieldsSummary(args, [
      ["firstName", "first name"],
      ["lastName", "last name"],
      ["email", "email"],
    ])})?`,
  update_user: (args) =>
    `Update this user's profile (${changedFieldsSummary(args, [
      ["firstName", "first name"],
      ["lastName", "last name"],
      ["email", "email"],
    ])})?`,
  block_user: () => "Block this user account? They won't be able to log in until unblocked.",
  unblock_user: () => "Unblock this user account?",
  remove_manager: () => "Delete this manager account? This cannot be undone.",
  mark_notifications_read: () => "Mark all of your notifications as read?",
};

export function describeConfirmation(tool: string, args: unknown): string {
  const builder = CONFIRMATION_PROMPTS[tool];
  if (builder) return builder(args);
  return "Adam wants to make this change. Proceed?";
}
