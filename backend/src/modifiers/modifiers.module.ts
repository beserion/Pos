import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModifiersController } from './modifiers.controller';
import { ModifiersService } from './modifiers.service';
import { Modifier } from './modifier.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Modifier])],
    controllers: [ModifiersController],
    providers: [ModifiersService],
    exports: [ModifiersService],
})
export class ModifiersModule { }
