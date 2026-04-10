import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentGroupsService } from './parent-groups.service';
import { ParentGroupsController } from './parent-groups.controller';
import { ParentGroup } from './parent-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParentGroup])],
  controllers: [ParentGroupsController],
  providers: [ParentGroupsService],
  exports: [ParentGroupsService],
})
export class ParentGroupsModule {}
