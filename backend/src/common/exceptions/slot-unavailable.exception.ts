import { HttpException, HttpStatus } from '@nestjs/common';

export class SlotUnavailableException extends HttpException {
  constructor(slotId: string) {
    super(
      {
        message: `Parking slot ${slotId} is not available for the requested time range`,
        error: 'SlotUnavailable',
      },
      HttpStatus.CONFLICT,
    );
  }
}
