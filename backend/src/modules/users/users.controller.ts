import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';
import { SavePaymentMethodDto } from './dto/save-payment-method.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create a user with any role (Admin only)',
    description:
      'The only way to create MANAGER or ADMIN accounts — public registration ' +
      '(POST /auth/register) always creates a CUSTOMER. The new account logs in normally ' +
      'via POST /auth/login.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  create(
    @Body() dto: CreateUserDto,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    const admin = req.user as AuthenticatedUser;
    return this.usersService.create(dto, admin.userId);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of users',
    type: [UserResponseDto],
  })
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user\'s own profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user',
    type: UserResponseDto,
  })
  findMe(@Req() req: Request): Promise<UserResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.usersService.findOne(user.userId);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change the authenticated user\'s own password' })
  @ApiResponse({ status: 204, description: 'Password changed' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  changeMyPassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    const user = req.user as AuthenticatedUser;
    return this.usersService.changePassword(user.userId, dto);
  }

  @Put('me/payment-method')
  @ApiOperation({
    summary: "Save (or replace) the authenticated user's payment method",
    description:
      'Only the cardholder name, brand, last 4 digits, and expiry are stored — the full ' +
      'card number and CVV are never persisted.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment method saved',
    type: PaymentMethodResponseDto,
  })
  savePaymentMethod(
    @Body() dto: SavePaymentMethodDto,
    @Req() req: Request,
  ): Promise<PaymentMethodResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.usersService.savePaymentMethod(user.userId, dto);
  }

  @Get('me/payment-method')
  @ApiOperation({ summary: "Get the authenticated user's saved payment method" })
  @ApiResponse({
    status: 200,
    description: 'Payment method found',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No payment method on file' })
  getPaymentMethod(@Req() req: Request): Promise<PaymentMethodResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.usersService.getPaymentMethod(user.userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get a user by id (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete your own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 409,
    description: 'User still has reservations or manages a parking lot',
  })
  remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const admin = req.user as AuthenticatedUser;
    return this.usersService.remove(id, admin.userId);
  }
}
