import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parameter } from './parameter.entity';
import { ParametersService } from './parameters.service';
import { ParametersController } from './parameters.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Parameter])],
  providers: [ParametersService],
  controllers: [ParametersController],
  exports: [ParametersService],
})
export class ParametersModule {}
