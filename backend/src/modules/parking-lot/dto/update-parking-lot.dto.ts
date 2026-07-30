import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateParkingLotDto } from './create-parking-lot.dto';

// Floor layout is configured at creation (and via the dedicated floor endpoints) and drives
// slot auto-generation — updating it here would silently desync from actual slots.
class UpdatableParkingLotFields extends OmitType(CreateParkingLotDto, [
  'floors',
] as const) {}

export class UpdateParkingLotDto extends PartialType(
  UpdatableParkingLotFields,
) {
  // Not inherited from CreateParkingLotDto — a lot always starts active; only an update can
  // deactivate one.
  @ApiPropertyOptional({
    description:
      'Deactivate a lot to hide it from customers without deleting it.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
