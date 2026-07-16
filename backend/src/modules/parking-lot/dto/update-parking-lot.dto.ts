import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateParkingLotDto } from './create-parking-lot.dto';

// Floor layout is configured at creation (and via the dedicated floor endpoints) and drives
// slot auto-generation — updating it here would silently desync from actual slots.
class UpdatableParkingLotFields extends OmitType(CreateParkingLotDto, [
  'floors',
] as const) {}

export class UpdateParkingLotDto extends PartialType(
  UpdatableParkingLotFields,
) {}
