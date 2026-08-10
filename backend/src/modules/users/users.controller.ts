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
import { CreateStaffDto } from './dto/create-staff.dto';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';
import { SavePaymentMethodDto } from './dto/save-payment-method.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateStaffRoleDto } from './dto/update-staff-role.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
  @ApiOperation({ summary: "Get the authenticated user's own profile" })
  @ApiResponse({
    status: 200,
    description: 'Current user',
    type: UserResponseDto,
  })
  findMe(@Req() req: Request): Promise<UserResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.usersService.findOne(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: "Update the authenticated user's own profile" })
  @ApiResponse({
    status: 200,
    description: 'Profile updated',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  updateMe(
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.usersService.updateProfile(user.userId, dto, user.role);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete the authenticated user's own account" })
  @ApiResponse({ status: 204, description: 'Account deleted' })
  @ApiResponse({
    status: 409,
    description: 'You manage a parking lot — reassign it first',
  })
  removeMe(@Req() req: Request): Promise<void> {
    const user = req.user as AuthenticatedUser;
    return this.usersService.removeSelf(user.userId);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change the authenticated user's own password" })
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
  @ApiOperation({
    summary: "Get the authenticated user's saved payment method",
  })
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

  @Post('staff')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create a manager or admin account (Admin only)',
    description:
      'Manager and admin are the roles an admin still provisions directly — public ' +
      'registration always creates a CUSTOMER, and this is separate from the general user ' +
      'list, which is view/block-only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Staff account created',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  createStaff(
    @Body() dto: CreateStaffDto,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    const admin = req.user as AuthenticatedUser;
    return this.usersService.createStaff(dto, admin.userId);
  }

  @Delete('managers/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a manager account (Admin only)' })
  @ApiResponse({ status: 204, description: 'Manager deleted' })
  @ApiResponse({ status: 400, description: 'Target is not a manager account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 409,
    description: 'This manager still manages a parking lot',
  })
  removeManager(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const admin = req.user as AuthenticatedUser;
    return this.usersService.removeManager(id, admin.userId);
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

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update another user's profile (Admin only)" })
  @ApiResponse({
    status: 200,
    description: 'Profile updated',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    const admin = req.user as AuthenticatedUser;
    return this.usersService.adminUpdateProfile(id, dto, admin.userId);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: "Change a manager or admin's role (Admin only)",
    description:
      'Switches an existing staff account between MANAGER and ADMIN. Target must already ' +
      'be a manager or admin — this does not promote a customer to staff (use POST ' +
      '/users/staff for that).',
  })
  @ApiResponse({ status: 200, description: 'Role changed', type: UserResponseDto })
  @ApiResponse({ status: 400, description: "Cannot change your own role, or target isn't staff" })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateStaffRoleDto,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    const admin = req.user as AuthenticatedUser;
    return this.usersService.updateStaffRole(id, dto, admin.userId);
  }

  @Patch(':id/block')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Block a user (Admin only)',
    description:
      'Blocks future logins and force-cancels any CONFIRMED reservations, freeing their ' +
      'slots. CHECKED_IN reservations are left untouched.',
  })
  @ApiResponse({
    status: 200,
    description: 'User blocked',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cannot block your own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  block(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    const admin = req.user as AuthenticatedUser;
    return this.usersService.block(id, admin.userId);
  }

  @Patch(':id/unblock')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Unblock a user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User unblocked',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  unblock(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    const admin = req.user as AuthenticatedUser;
    return this.usersService.unblock(id, admin.userId);
  }
}
