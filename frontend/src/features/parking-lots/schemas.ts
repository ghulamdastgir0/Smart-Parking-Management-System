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
