import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wastage } from './wastage.entity';
import { WastagesService } from './wastages.service';
import { WastagesController } from './wastages.controller';
import { StocksModule } from '../stocks/stocks.module';
import { SecurityModule } from '../auth/security.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Wastage]),
        StocksModule,
        SecurityModule,
    ],
    providers: [WastagesService],
    controllers: [WastagesController],
    exports: [WastagesService],
})
export class WastagesModule { }
