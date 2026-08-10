import { z } from "zod";
import { MAX_COLUMNS, MAX_ROWS } from "@/features/parking-lots/types";

export const FLOOR_NAME_MAX_LENGTH = 50;
export const LOT_NAME_MAX_LENGTH = 150;
export const LOT_ADDRESS_MAX_LENGTH = 255;

export const floorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Floor name is required")
    .max(FLOOR_NAME_MAX_LENGTH, `Floor name must be ${FLOOR_NAME_MAX_LENGTH} characters or fewer`),
  floorNumber: z.number().int().min(0).max(999),
  rows: z.number().int().min(1).max(MAX_ROWS),
  columns: z.number().int().min(1).max(MAX_COLUMNS),
  defaultSlotPrice: z.number().positive("Must be greater than 0"),
});

export type FloorFormValues = z.infer<typeof floorSchema>;

const editFloorBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Floor name is required")
    .max(FLOOR_NAME_MAX_LENGTH, `Floor name must be ${FLOOR_NAME_MAX_LENGTH} characters or fewer`),
  floorNumber: z.number().int().min(0).max(999),
  rows: z.number().int().min(1).max(MAX_ROWS),
  columns: z.number().int().min(1).max(MAX_COLUMNS),
  defaultSlotPrice: z.number().positive("Must be greater than 0").optional(),
});

/**
 * The rate is only required when the edit would add new slots (growing rows/columns) —
 * matches the backend, which needs a price to stamp onto slots it creates but has no
 * price to fall back on for a bare rename/renumber/shrink.
 */
export function buildEditFloorSchema(currentRows: number, currentColumns: number) {
  return editFloorBaseSchema.refine(
    (values) =>
      values.defaultSlotPrice !== undefined ||
      (values.rows <= currentRows && values.columns <= currentColumns),
    {
      message: "Rate is required when adding rows or columns",
      path: ["defaultSlotPrice"],
    },
  );
}

export type EditFloorFormValues = z.infer<typeof editFloorBaseSchema>;
