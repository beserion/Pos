import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderRoutingService } from './order-routing.service';
import { OrderRoutingController } from './order-routing.controller';
import { Product } from '../products/product.entity';
import { ProductType } from '../product-types/product-type.entity';
import { OutputProfile } from '../output-profiles/output-profile.entity';
import { Department } from '../departments/department.entity';
import { SaleItem } from '../sales/sale-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductType,
      OutputProfile,
      Department,
      SaleItem,
    ]),
  ],
  controllers: [OrderRoutingController],
  providers: [OrderRoutingService],
  exports: [OrderRoutingService],
})
export class OrderRoutingModule {}
