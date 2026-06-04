import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModifiersController } from './modifiers.controller';
import { ModifiersService } from './modifiers.service';
import { ModifierGroupsController } from './modifier-groups.controller';
import { ModifierGroupsService } from './modifier-groups.service';
import { Modifier } from './modifier.entity';
import { ModifierGroup } from './modifier-group.entity';
import { ProductsModule } from '../products/products.module';

@Module({
    imports: [TypeOrmModule.forFeature([Modifier, ModifierGroup]), ProductsModule],
    controllers: [ModifiersController, ModifierGroupsController],
    providers: [ModifiersService, ModifierGroupsService],
    exports: [ModifiersService, ModifierGroupsService],
})
export class ModifiersModule { }
