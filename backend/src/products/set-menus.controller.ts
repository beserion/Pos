import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SetMenu } from './set-menu.entity';
import { SetGroup } from './set-group.entity';
import { SetGroupItem } from './set-group-item.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('set-menus')
@UseGuards(JwtAuthGuard)
export class SetMenusController {
  constructor(
    @InjectRepository(SetMenu)
    private setMenuRepository: Repository<SetMenu>,
    @InjectRepository(SetGroup)
    private setGroupRepository: Repository<SetGroup>,
    @InjectRepository(SetGroupItem)
    private setGroupItemRepository: Repository<SetGroupItem>,
  ) {}

  @Get()
  @Permissions('VIEW_PRODUCTS')
  findAll() {
    return this.setMenuRepository.find({ relations: ['product', 'groups', 'groups.items'] });
  }

  @Get(':id')
  @Permissions('VIEW_PRODUCTS')
  findOne(@Param('id') id: string) {
    return this.setMenuRepository.findOne({
      where: { id: +id },
      relations: ['product', 'groups', 'groups.items'],
    });
  }

  @Post()
  @Permissions('ADD_PRODUCTS')
  async create(@Body() setMenuData: any) {
    // Nested save supports creating groups and items if cascade: true is set
    const setMenu = this.setMenuRepository.create(setMenuData);
    return this.setMenuRepository.save(setMenu);
  }

  @Put(':id')
  @Permissions('EDIT_PRODUCTS')
  async update(@Param('id') id: string, @Body() updateData: any) {
    const existing = await this.setMenuRepository.findOne({ 
      where: { id: +id },
      relations: ['groups', 'groups.items'] 
    });
    if (!existing) throw new NotFoundException('Set menü bulunamadı.');
    
    // TypeORM's save with orphanRemoval:true requires merging into the existing entity instance
    const updated = this.setMenuRepository.merge(existing, updateData);
    return this.setMenuRepository.save(updated);
  }

  @Delete(':id')
  @Permissions('DELETE_PRODUCTS')
  async remove(@Param('id') id: string) {
    await this.setMenuRepository.delete(+id);
    return { success: true };
  }
}
