import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Prisma,
  QrCodeStatus,
  QrCodeType,
  ReservationStatus,
  Role,
  SlotStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';
import { SavePaymentMethodDto } from './dto/save-payment-method.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateStaffRoleDto } from './dto/update-staff-role.dto';
import { UserResponseDto } from './dto/user-response.dto';

const SALT_ROUNDS = 10;

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isBlocked: true,
  createdAt: true,
  paymentMethod: { select: { id: true } },
} as const;

type RawSafeUser = Prisma.UserGetPayload<{ select: typeof SAFE_USER_SELECT }>;

function toUserResponse(user: RawSafeUser): UserResponseDto {
  const { paymentMethod, ...rest } = user;
  return { ...rest, hasPaymentMethod: paymentMethod !== null };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return users.map(toUserResponse);
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return toUserResponse(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    requestingUserRole: Role,
  ): Promise<UserResponseDto> {
    if (dto.email) {
      // Manager accounts are provisioned by an admin (see createManager) — the admin owns
      // that identity, so a manager can't self-serve their way to a different email address.
      if (requestingUserRole === Role.MANAGER) {
        throw new ForbiddenException(
          'Managers cannot change their email — contact an administrator',
        );
      }
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: userId } },
      });
      if (existing) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
      select: SAFE_USER_SELECT,
    });

    await this.auditService.log({
      entityType: 'User',
      entityId: userId,
      action: 'PROFILE_UPDATED',
      userId,
    });

    return toUserResponse(user);
  }

  /**
   * Blocking cuts off login and force-cancels any CONFIRMED reservations (freeing their
   * slots) — but leaves CHECKED_IN ones alone, since a vehicle already on-site can't be
   * un-parked by a database write. Kept self-contained here rather than calling into
   * ReservationService, matching this codebase's existing self-contained-service style.
   */
  async block(id: string, requestingUserId: string): Promise<UserResponseDto> {
    if (id === requestingUserId) {
      throw new BadRequestException('You cannot block your own account');
    }
    await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { isBlocked: true } });

      const activeReservations = await tx.reservation.findMany({
        where: { userId: id, status: ReservationStatus.CONFIRMED },
      });

      for (const reservation of activeReservations) {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.CANCELLED },
        });
        await tx.parkingSlot.updateMany({
          where: { id: reservation.slotId, status: SlotStatus.RESERVED },
          data: { status: SlotStatus.AVAILABLE },
        });
        await tx.qrCode.updateMany({
          where: {
            reservationId: reservation.id,
            type: QrCodeType.CHECK_IN,
            status: QrCodeStatus.ACTIVE,
          },
          data: { status: QrCodeStatus.EXPIRED },
        });
      }

      await this.auditService.log(
        {
          entityType: 'User',
          entityId: id,
          action: 'USER_BLOCKED',
          userId: requestingUserId,
          metadata: { cancelledReservations: activeReservations.length },
        },
        tx,
      );
    });

    return this.findOne(id);
  }

  async unblock(
    id: string,
    requestingUserId: string,
  ): Promise<UserResponseDto> {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { isBlocked: false },
    });

    await this.auditService.log({
      entityType: 'User',
      entityId: id,
      action: 'USER_UNBLOCKED',
      userId: requestingUserId,
    });

    return this.findOne(id);
  }

  /**
   * Manager and admin accounts are the roles an admin still provisions directly —
   * self-registration always creates a CUSTOMER, and this is intentionally separate from the
   * general user list (which is view/block-only) so staff lifecycle stays a distinct,
   * admin-only workflow.
   */
  async createStaff(
    dto: CreateStaffDto,
    createdByUserId: string,
  ): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
      },
      select: SAFE_USER_SELECT,
    });

    await this.auditService.log({
      entityType: 'User',
      entityId: user.id,
      action: 'STAFF_CREATED_BY_ADMIN',
      userId: createdByUserId,
      metadata: { email: user.email, role: user.role },
    });

    return toUserResponse(user);
  }

  /**
   * An admin editing another staff member's profile — unlike the self-service
   * updateProfile(), this doesn't apply the manager email-lock, since the admin (not the
   * manager) is the one making the change.
   */
  async adminUpdateProfile(
    userId: string,
    dto: UpdateProfileDto,
    requestingUserId: string,
  ): Promise<UserResponseDto> {
    await this.findOne(userId);

    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: userId } },
      });
      if (existing) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
      select: SAFE_USER_SELECT,
    });

    await this.auditService.log({
      entityType: 'User',
      entityId: userId,
      action: 'PROFILE_UPDATED_BY_ADMIN',
      userId: requestingUserId,
    });

    return toUserResponse(user);
  }

  async updateStaffRole(
    id: string,
    dto: UpdateStaffRoleDto,
    requestingUserId: string,
  ): Promise<UserResponseDto> {
    if (id === requestingUserId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const target = await this.findOne(id);
    if (target.role !== Role.MANAGER && target.role !== Role.ADMIN) {
      throw new BadRequestException('Target is not a manager or admin account');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: SAFE_USER_SELECT,
    });

    await this.auditService.log({
      entityType: 'User',
      entityId: id,
      action: 'ROLE_CHANGED',
      userId: requestingUserId,
    });

    return toUserResponse(user);
  }

  async removeManager(id: string, requestingUserId: string): Promise<void> {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException(`User ${id} not found`);
    }
    if (target.role !== Role.MANAGER) {
      throw new BadRequestException(
        'This endpoint can only delete manager accounts',
      );
    }

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'This manager still manages a parking lot — reassign it to another manager first',
        );
      }
      throw error;
    }

    await this.auditService.log({
      entityType: 'User',
      entityId: id,
      action: 'MANAGER_DELETED_BY_ADMIN',
      userId: requestingUserId,
    });
  }

  /** A user deleting their own account — distinct from the removed admin-delete-others flow. */
  async removeSelf(userId: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'You manage a parking lot — reassign it to another manager before deleting your account',
        );
      }
      throw error;
    }

    await this.auditService.log({
      entityType: 'User',
      entityId: userId,
      action: 'USER_SELF_DELETED',
      userId,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const currentPasswordMatches = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    await this.auditService.log({
      entityType: 'User',
      entityId: userId,
      action: 'PASSWORD_CHANGED',
      userId,
    });
  }

  async savePaymentMethod(
    userId: string,
    dto: SavePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    const brand = detectCardBrand(dto.cardNumber);
    const last4 = dto.cardNumber.slice(-4);

    const paymentMethod = await this.prisma.paymentMethod.upsert({
      where: { userId },
      create: {
        userId,
        cardholderName: dto.cardholderName,
        brand,
        last4,
        expiryMonth: dto.expiryMonth,
        expiryYear: dto.expiryYear,
      },
      update: {
        cardholderName: dto.cardholderName,
        brand,
        last4,
        expiryMonth: dto.expiryMonth,
        expiryYear: dto.expiryYear,
      },
    });

    await this.auditService.log({
      entityType: 'User',
      entityId: userId,
      action: 'PAYMENT_METHOD_SAVED',
      userId,
      metadata: { brand, last4 },
    });

    return paymentMethod;
  }

  async getPaymentMethod(userId: string): Promise<PaymentMethodResponseDto> {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { userId },
    });
    if (!paymentMethod) {
      throw new NotFoundException('No payment method on file');
    }
    return paymentMethod;
  }
}

function detectCardBrand(cardNumber: string): string {
  if (cardNumber.startsWith('4')) return 'Visa';
  if (cardNumber.startsWith('5')) return 'Mastercard';
  return 'Card';
}
