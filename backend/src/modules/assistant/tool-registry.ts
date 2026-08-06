import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CheckpointService } from '../checkpoint/checkpoint.service';
import { NotificationService } from '../../common/notification/notification.service';
import { ParkingLotService } from '../parking-lot/parking-lot.service';
import { ParkingSlotService } from '../parking-slot/parking-slot.service';
import { PolicyService } from '../policy/policy.service';
import { ReservationService } from '../reservation/reservation.service';
import { UsersService } from '../users/users.service';
import { ToolDefinition } from './tool-definition';
import { buildCheckpointTools } from './tools/checkpoint.tools';
import { buildNotificationTools } from './tools/notification.tools';
import { buildParkingLotTools } from './tools/parking-lot.tools';
import { buildParkingSlotTools } from './tools/parking-slot.tools';
import { buildPolicyTools } from './tools/policy.tools';
import { buildReservationTools } from './tools/reservation.tools';
import { buildUsersTools } from './tools/users.tools';

// Built once at construction (these are just plain descriptors, independent of any specific
// chat request) and filtered per-request by role in AssistantService — the model is only ever
// handed the tools its caller is actually allowed to use.
@Injectable()
export class ToolRegistry {
  private readonly allTools: ToolDefinition[];

  constructor(
    parkingLotService: ParkingLotService,
    parkingSlotService: ParkingSlotService,
    reservationService: ReservationService,
    checkpointService: CheckpointService,
    usersService: UsersService,
    notificationService: NotificationService,
    policyService: PolicyService,
  ) {
    this.allTools = [
      ...buildParkingLotTools(parkingLotService),
      ...buildParkingSlotTools(parkingSlotService),
      ...buildReservationTools(reservationService),
      ...buildCheckpointTools(checkpointService),
      ...buildUsersTools(usersService),
      ...buildNotificationTools(notificationService),
      ...buildPolicyTools(policyService),
    ];
  }

  forRole(role: Role): ToolDefinition[] {
    return this.allTools.filter(
      (tool) => !tool.roles || tool.roles.includes(role),
    );
  }
}
