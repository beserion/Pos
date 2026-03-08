import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
