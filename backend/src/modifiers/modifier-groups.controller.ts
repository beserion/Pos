import {
    Controller,
    Get,
    Post,
    Body,
    Put,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { ModifierGroupsService } from './modifier-groups.service';
import { ModifierGroup } from './modifier-group.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('modifier-groups')
@UseGuards(JwtAuthGuard)
export class ModifierGroupsController {
    constructor(private readonly modifierGroupsService: ModifierGroupsService) { }

    @Get()
    findAll(): Promise<ModifierGroup[]> {
        return this.modifierGroupsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string): Promise<ModifierGroup> {
        return this.modifierGroupsService.findOne(+id);
    }

    @Post()
    create(@Body() groupData: Partial<ModifierGroup>): Promise<ModifierGroup> {
        return this.modifierGroupsService.create(groupData);
    }

    @Put(':id')
    update(
        @Param('id') id: string,
        @Body() groupData: Partial<ModifierGroup>,
    ): Promise<ModifierGroup> {
        return this.modifierGroupsService.update(+id, groupData);
    }

    @Delete(':id')
    remove(@Param('id') id: string): Promise<void> {
        return this.modifierGroupsService.remove(+id);
    }
}
