import { Badge } from "@/components/ui/badge";
import {
  RESERVATION_STATUS_LABEL,
  RESERVATION_STATUS_VARIANT,
  type ReservationStatus,
} from "@/types/enums";

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <Badge variant={RESERVATION_STATUS_VARIANT[status]}>
      {RESERVATION_STATUS_LABEL[status]}
    </Badge>
  );
}
