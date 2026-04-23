import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  // Force seed sync on restart
  private async seedDefaults() {
    const templates = [
      {
        name: 'GARSON',
        description: 'Standart Garson Rolü (Sipariş, Masa ve Mutfak Yönetimi)',
        permissions: [
          'WAITER:VIEW', 'WAITER:ADD', 'WAITER:EDIT',
          'KITCHEN:VIEW', 'KITCHEN:APPROVE',
          'SALES:VIEW', 'SALES:ADD', 'SALES:PRINT',
          'TABLES:VIEW',
          'OP:CAN_ORDER', 'OP:ORDER_AFTER_BILL', 'OP:CAN_TRANSFER', 'OP:CAN_PRINT_BILL', 'OP:REPRINT_BILL',
          'OP:SET_MENU_SALE', 'OP:COMBO_SALE',
          'OWN_TABLES_ONLY', 'TABLE_ACCESS:ALL'
        ]
      },
      {
        name: 'KASİYER',
        description: 'Kasiyer Rolü (Ödeme, İndirim, İptal ve Rapor Yetkili)',
        permissions: [
          'SALES:VIEW', 'SALES:ADD', 'SALES:EDIT', 'SALES:DELETE', 'SALES:PRINT', 'SALES:APPROVE',
          'FINANCE:VIEW', 'FINANCE:ADD', 'FINANCE:EDIT', 'FINANCE:DELETE', 'FINANCE:PRINT', 'FINANCE:APPROVE',
          'REPORTS:VIEW', 'REPORTS:PRINT', 'WAITER:VIEW', 'KITCHEN:VIEW',
          'TABLES:VIEW', 'TABLE_ACCESS:ALL',
          'OP:CAN_ORDER', 'OP:ORDER_AFTER_BILL', 'OP:CAN_TRANSFER', 'OP:CAN_PRINT_BILL', 'OP:REPRINT_BILL',
          'OP:CAN_CANCEL_SALE', 'OP:RECALL_CLOSED_BILL', 'OP:UNLOCK_BILL',
          'OP:CAN_DISCOUNT', 'OP:DISCOUNT_AFTER_BILL', 'OP:CAN_REFUND', 'OP:CAN_PROMOTION', 'OP:BOGO_CAMPAIGN',
          'OP:CAN_COMPLIMENTARY', 'OP:CAN_CHANGE_PRICE', 'OP:NON_PAYMENT',
          'OP:FINANCE_CLOSE_ACCOUNT', 'OP:FINANCE_CLOSE_OPEN_ACCOUNT', 'OP:FINANCE_PARTIAL_PAYMENT',
          'OP:FINANCE_DOWN_PAYMENT', 'OP:FINANCE_COLLECT_CURRENT_ACCOUNT', 'OP:FINANCE_PAY_CURRENT_ACCOUNT',
          'OP:FINANCE_CLOSE_TO_CURRENT_ACCOUNT',
          'OP:START_FISCAL', 'OP:FISCAL_TRANSACTIONS',
          'OP:REPORT_VIEW', 'OP:REPORT_SALES_ANALYSIS', 'OP:REPORT_X', 'OP:REPORT_Z', 'OP:END_OF_DAY', 'OP:REPORT_CASH_REGISTER'
        ]
      },
      {
        name: 'MÜDÜR',
        description: 'Tüm Operasyonel ve Finansal Yetkiler',
        permissions: [
          'LOCATIONS:VIEW', 'ZONES:VIEW', 'TABLES:VIEW', 'EMPLOYEES:VIEW', 'WAREHOUSES:VIEW', 'PRODUCTS:VIEW', 'INGREDIENTS:VIEW', 'RECIPES:VIEW',
          'SALES:VIEW', 'SALES:ADD', 'SALES:EDIT', 'SALES:DELETE', 'SALES:PRINT', 'SALES:APPROVE',
          'ORDERS:VIEW', 'ORDERS:ADD', 'ORDERS:EDIT', 'ORDERS:DELETE', 'ORDERS:PRINT', 'ORDERS:APPROVE',
          'DELIVERY:VIEW', 'DELIVERY:ADD', 'DELIVERY:EDIT', 'DELIVERY:DELETE', 'DELIVERY:APPROVE',
          'FINANCE:VIEW', 'FINANCE:ADD', 'FINANCE:EDIT', 'FINANCE:DELETE', 'FINANCE:PRINT', 'FINANCE:APPROVE',
          'REPORTS:VIEW', 'REPORTS:PRINT', 'WAITER:VIEW', 'KITCHEN:VIEW',
          'OP:CAN_ORDER', 'OP:ORDER_AFTER_BILL', 'OP:CAN_PRINT_BILL', 'OP:REPRINT_BILL',
          'OP:CAN_CANCEL_SALE', 'OP:RECALL_CLOSED_BILL', 'OP:UNLOCK_BILL',
          'OP:CAN_CHANGE_PRICE', 'OP:PRICE_AFTER_BILL', 'OP:CAN_DISCOUNT', 'OP:DISCOUNT_AFTER_BILL',
          'OP:CAN_COMPLIMENTARY', 'OP:CAN_REFUND', 'OP:CAN_PROMOTION', 'OP:STAFF_SALE', 'OP:NON_PAYMENT',
          'OP:SET_MENU_SALE', 'OP:COMBO_SALE', 'OP:BOGO_CAMPAIGN',
          'OP:FINANCE_CLOSE_ACCOUNT', 'OP:FINANCE_CLOSE_OPEN_ACCOUNT', 'OP:FINANCE_PARTIAL_PAYMENT',
          'OP:FINANCE_DOWN_PAYMENT', 'OP:FINANCE_COLLECT_CURRENT_ACCOUNT', 'OP:FINANCE_PAY_CURRENT_ACCOUNT', 'OP:FINANCE_CLOSE_TO_CURRENT_ACCOUNT',
          'OP:START_FISCAL', 'OP:FISCAL_TRANSACTIONS',
          'OP:REPORT_VIEW', 'OP:REPORT_SALES_ANALYSIS', 'OP:REPORT_X', 'OP:REPORT_Z', 'OP:END_OF_DAY', 'OP:REPORT_CASH_REGISTER', 'OP:VIEW_LOGS',
          'TABLE_ACCESS:ALL'
        ]
      },
      {
        name: 'PATRON',
        description: 'Tam Yetkili İşletme Sahibi',
        permissions: [
          'LOCATIONS:VIEW', 'LOCATIONS:ADD', 'LOCATIONS:EDIT', 'LOCATIONS:DELETE',
          'ZONES:VIEW', 'ZONES:ADD', 'ZONES:EDIT', 'ZONES:DELETE',
          'TABLES:VIEW', 'TABLES:ADD', 'TABLES:EDIT', 'TABLES:DELETE',
          'EMPLOYEES:VIEW', 'EMPLOYEES:ADD', 'EMPLOYEES:EDIT', 'EMPLOYEES:DELETE',
          'WAREHOUSES:VIEW', 'WAREHOUSES:ADD', 'WAREHOUSES:EDIT', 'WAREHOUSES:DELETE',
          'PRODUCTS:VIEW', 'PRODUCTS:ADD', 'PRODUCTS:EDIT', 'PRODUCTS:DELETE',
          'INGREDIENTS:VIEW', 'INGREDIENTS:ADD', 'INGREDIENTS:EDIT', 'INGREDIENTS:DELETE',
          'RECIPES:VIEW', 'RECIPES:ADD', 'RECIPES:EDIT', 'RECIPES:DELETE',
          'SALES:VIEW', 'SALES:ADD', 'SALES:EDIT', 'SALES:DELETE', 'SALES:PRINT', 'SALES:APPROVE',
          'ORDERS:VIEW', 'ORDERS:ADD', 'ORDERS:EDIT', 'ORDERS:DELETE', 'ORDERS:PRINT', 'ORDERS:APPROVE',
          'FINANCE:VIEW', 'FINANCE:ADD', 'FINANCE:EDIT', 'FINANCE:DELETE', 'FINANCE:PRINT', 'FINANCE:APPROVE',
          'USERS:VIEW', 'USERS:ADD', 'USERS:EDIT', 'USERS:DELETE',
          'ROLES:VIEW', 'ROLES:ADD', 'ROLES:EDIT', 'ROLES:DELETE',
          'OP:CAN_ORDER', 'OP:ORDER_AFTER_BILL', 'OP:CAN_PRINT_BILL', 'OP:REPRINT_BILL',
          'OP:CAN_CANCEL_SALE', 'OP:RECALL_CLOSED_BILL', 'OP:UNLOCK_BILL',
          'OP:CAN_CHANGE_PRICE', 'OP:PRICE_AFTER_BILL', 'OP:CAN_DISCOUNT', 'OP:DISCOUNT_AFTER_BILL',
          'OP:CAN_COMPLIMENTARY', 'OP:CAN_REFUND', 'OP:CAN_PROMOTION', 'OP:STAFF_SALE', 'OP:NON_PAYMENT',
          'OP:SET_MENU_SALE', 'OP:COMBO_SALE', 'OP:BOGO_CAMPAIGN',
          'OP:FINANCE_CLOSE_ACCOUNT', 'OP:FINANCE_CLOSE_OPEN_ACCOUNT', 'OP:FINANCE_PARTIAL_PAYMENT',
          'OP:FINANCE_DOWN_PAYMENT', 'OP:FINANCE_COLLECT_CURRENT_ACCOUNT', 'OP:FINANCE_PAY_CURRENT_ACCOUNT', 'OP:FINANCE_CLOSE_TO_CURRENT_ACCOUNT',
          'OP:START_FISCAL', 'OP:FISCAL_TRANSACTIONS',
          'OP:REPORT_VIEW', 'OP:REPORT_SALES_ANALYSIS', 'OP:REPORT_X', 'OP:REPORT_Z', 'OP:END_OF_DAY', 'OP:REPORT_CASH_REGISTER', 'OP:VIEW_LOGS',
          'TABLE_ACCESS:ALL'
        ]
      }
    ];

    for (const t of templates) {
      // Find role by exact name OR case-insensitive match to avoid duplicates like "Garson" vs "GARSON"
      const existing = await this.roleRepository.createQueryBuilder('role')
        .where('LOWER(role.name) = LOWER(:name)', { name: t.name })
        .getOne();

      if (!existing) {
        await this.roleRepository.save(this.roleRepository.create(t));
        console.log(`[RolesService] Seeded default role: ${t.name}`);
      } else {
        // Update existing role with template permissions
        existing.permissions = t.permissions;
        existing.description = t.description;
        // Also ensure the name matches the template (e.g. rename "Garson" to "GARSON" if preferred, 
        // or just keep existing name but update permissions)
        await this.roleRepository.save(existing);
        console.log(`[RolesService] Updated existing role permissions for: ${existing.name}`);
      }
    }
  }

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find({ relations: ['users'] });
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async create(roleData: Partial<Role>): Promise<Role> {
    const newRole = this.roleRepository.create(roleData);
    return await this.roleRepository.save(newRole);
  }

  async update(id: number, updateData: Partial<Role>): Promise<Role> {
    const role = await this.findOne(id);
    const { id: _, users, createdAt, updatedAt, ...data } = updateData as any;
    this.roleRepository.merge(role, data);
    return await this.roleRepository.save(role);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.roleRepository.delete(id);
  }
}
