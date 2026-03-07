import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { SecurityModule } from '../auth/security.module';
import { RecipesModule } from '../recipes/recipes.module';
import { StocksModule } from '../stocks/stocks.module';

import { Table } from '../tables/table.entity';
import { User } from '../users/user.entity';
import { KitchenGateway } from './kitchen.gateway';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderItem, Table, User]),
        SecurityModule,
        RecipesModule,
        StocksModule,
    ],
    providers: [OrdersService, KitchenGateway],
    controllers: [OrdersController],
    exports: [OrdersService],
})
export class OrdersModule { }
