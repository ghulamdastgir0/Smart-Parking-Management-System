import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';
import { SavePaymentMethodDto } from './dto/save-payment-method.dto';
import { UserResponseDto } from './dto/user-response.dto';

const SALT_ROUNDS = 10;

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
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

  async create(
    dto: CreateUserDto,
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
      action: 'USER_CREATED_BY_ADMIN',
      userId: createdByUserId,
      metadata: { email: user.email, role: user.role },
    });

    return toUserResponse(user);
  }

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

  async remove(id: string, requestingUserId: string): Promise<void> {
    if (id === requestingUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    await this.findOne(id);

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'This user manages a parking lot — reassign it to another manager first',
        );
      }
      throw error;
    }

    await this.auditService.log({
      entityType: 'User',
      entityId: id,
      action: 'USER_DELETED_BY_ADMIN',
      userId: requestingUserId,
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
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
