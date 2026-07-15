import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateParkingLotDto } from './create-parking-lot.dto';

// The parking layout (rows/columns/defaultSlotPrice) is configured once at creation and
// drives slot auto-generation — updating it here would silently desync from actual slots.
class UpdatableParkingLotFields extends OmitType(CreateParkingLotDto, [
  'rows',
  'columns',
  'defaultSlotPrice',
] as const) {}

export class UpdateParkingLotDto extends PartialType(
  UpdatableParkingLotFields,
) {}
