import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductType } from './product-type.entity';
import { ProductTypesService } from './product-types.service';
import { ProductTypesController } from './product-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductType])],
  controllers: [ProductTypesController],
  providers: [ProductTypesService],
  exports: [ProductTypesService],
})
export class ProductTypesModule {}
