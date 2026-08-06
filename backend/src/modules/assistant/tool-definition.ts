import { HttpException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodType;
  /** undefined = usable by any authenticated role */
  roles?: Role[];
  /** mutating tools are wrapped with an interrupt()-based confirmation step before running */
  mutating: boolean;
  // Args are validated against `schema` by the LangChain tool wrapper before this ever runs,
  // so re-deriving a precise type here per tool isn't load-bearing — `any` lets each domain
  // file's execute() destructure/pass its args straight into the matching service DTO.
  execute: (user: AuthenticatedUser, args: any) => Promise<unknown>;
}

// Every tool's execute() returns whatever the underlying service returns; this normalizes it
// to a string for the model, and turns the same HttpExceptions the REST controllers would
// return (403 ownership checks, 404s, 409 conflicts, ...) into a natural-language result
// instead of crashing the graph.
export async function runToolSafely(
  fn: () => Promise<unknown>,
): Promise<string> {
  try {
    const result = await fn();
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (error) {
    if (error instanceof HttpException) {
      return `Error: ${error.message}`;
    }
    throw error;
  }
}
