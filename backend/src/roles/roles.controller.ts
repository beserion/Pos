import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role } from './role.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Get()
    @Permissions('VIEW_ROLES')
    findAll() {
        return this.rolesService.findAll();
    }

    @Get(':id')
    @Permissions('VIEW_ROLES')
    findOne(@Param('id') id: string) {
        return this.rolesService.findOne(+id);
    }

    @Post()
    @Permissions('ADD_ROLES')
    create(@Body() roleData: Partial<Role>) {
        return this.rolesService.create(roleData);
    }

    @Put(':id')
    @Permissions('EDIT_ROLES')
    update(@Param('id') id: string, @Body() updateData: Partial<Role>) {
        return this.rolesService.update(+id, updateData);
    }

    @Delete(':id')
    @Permissions('DELETE_ROLES')
    remove(@Param('id') id: string) {
        return this.rolesService.remove(+id);
    }
}
