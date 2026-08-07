import { z } from 'zod';
import { ToolDefinition } from '../tool-definition';

// Resolved entirely via the needsLocation interrupt in AssistantService#toLangChainTool, which
// pauses the graph, asks the client's browser for a live position, and resumes with the result
// (or null if declined/unavailable) before this would ever run.
export function buildLocationTools(): ToolDefinition[] {
  return [
    {
      name: 'get_user_location',
      description:
        "Ask the user's device for their current GPS location (latitude/longitude). Use this " +
        'when you need their coordinates — e.g. for find_nearby_parking_lots — and they have not ' +
        "already been provided in this conversation's session context. Call it at most once per " +
        'turn; if it comes back unavailable (denied, unsupported, or failed), ask the user to name ' +
        'a place or a specific parking lot instead of calling it again.',
      schema: z.object({}),
      mutating: false,
      needsLocation: true,
      execute: () => {
        throw new Error(
          'unreachable: get_user_location is handled by the needsLocation interrupt before execute() runs',
        );
      },
    },
  ];
}
