import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ModifiersService } from './modifiers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Modifier } from './modifier.entity';

@Controller('modifiers')
@UseGuards(JwtAuthGuard)
export class ModifiersController {
    constructor(private readonly modifiersService: ModifiersService) { }

    @Get()
    @Permissions('VIEW_PRODUCTS')
    findAll() {
        return this.modifiersService.findAll();
    }

    @Get(':id')
    @Permissions('VIEW_PRODUCTS')
    findOne(@Param('id') id: string) {
        return this.modifiersService.findOne(+id);
    }

    @Post()
    @Permissions('ADD_PRODUCTS')
    create(@Body() modifierData: Partial<Modifier>) {
        return this.modifiersService.create(modifierData);
    }

    @Put(':id')
    @Permissions('EDIT_PRODUCTS')
    update(@Param('id') id: string, @Body() modifierData: Partial<Modifier>) {
        return this.modifiersService.update(+id, modifierData);
    }

    @Delete(':id')
    @Permissions('DELETE_PRODUCTS')
    remove(@Param('id') id: string) {
        return this.modifiersService.remove(+id);
    }
}
