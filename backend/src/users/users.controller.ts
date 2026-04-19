import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  async getMe(@Req() req: any) {
    const user = await this.usersService.findOne(req.user.userId || req.user.id);
    return {
      id: user.id,
      email: user.email,
      role: user.role?.name,
      permissions: user.role?.permissions,
      extraPermissions: user.extraPermissions,
    };
  }

  @Get('cashiers')
  findCashiers() {
    return this.usersService.findCashiers();
  }

  /** GET /users/check-pin?pin=1234&excludeId=5  â†’ { unique: true/false } */
  @Get('check-pin')
  async checkPin(
    @Query('pin') pin: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const unique = await this.usersService.isPinUnique(
      pin,
      excludeId ? +excludeId : undefined,
    );
    return { unique };
  }

  @Get()
  @Permissions('VIEW_USERS')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Permissions('VIEW_USERS')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Post()
  @Permissions('ADD_USERS')
  create(@Body() userData: Partial<User>) {
    return this.usersService.create(userData);
  }

  @Put(':id')
  @Permissions('EDIT_USERS')
  update(@Param('id') id: string, @Body() updateData: Partial<User>) {
    return this.usersService.update(+id, updateData);
  }

  @Delete(':id')
  @Permissions('DELETE_USERS')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Post('batch-role')
  @Permissions('EDIT_USERS')
  batchUpdateRole(@Body() body: { userIds: number[]; roleId: number }) {
    return this.usersService.batchUpdateRole(body.userIds, body.roleId);
  }

  @Post(':id/push-subscribe')
  async pushSubscribe(@Param('id') id: string, @Body() subscription: any) {
    await this.usersService.savePushSubscription(+id, subscription);
    return { success: true };
  }
}

