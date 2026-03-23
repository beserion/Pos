import {
  Injectable,
  OnApplicationBootstrap,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PermModule } from './permission-module.entity';


// Default seed data — mirrored from frontend MODULES constant
const DEFAULT_MODULES = [
  { key: 'LOCATIONS',   label: 'Şube Yönetimi',      icon: 'fa-location-dot',       color: 'text-blue-500',    accentBg: 'bg-blue-500/10',    actions: 'VIEW,ADD,EDIT,DELETE',              sortOrder: 1  },
  { key: 'ZONES',       label: 'Bölüm Yönetimi',     icon: 'fa-layer-group',        color: 'text-indigo-500',  accentBg: 'bg-indigo-500/10',  actions: 'VIEW,ADD,EDIT,DELETE',              sortOrder: 2  },
  { key: 'TABLES',      label: 'Masa Yönetimi',      icon: 'fa-chair',              color: 'text-cyan-500',    accentBg: 'bg-cyan-500/10',    actions: 'VIEW,ADD,EDIT,DELETE',              sortOrder: 3  },
  { key: 'EMPLOYEES',   label: 'Personel',           icon: 'fa-user-tie',           color: 'text-emerald-500', accentBg: 'bg-emerald-500/10', actions: 'VIEW,ADD,EDIT,DELETE,PRINT',        sortOrder: 4  },
  { key: 'WAREHOUSES',  label: 'Depo Yönetimi',      icon: 'fa-warehouse',          color: 'text-amber-500',   accentBg: 'bg-amber-500/10',   actions: 'VIEW,ADD,EDIT,DELETE',              sortOrder: 5  },
  { key: 'PRODUCTS',    label: 'Ürün Yönetimi',      icon: 'fa-box-open',           color: 'text-purple-500',  accentBg: 'bg-purple-500/10',  actions: 'VIEW,ADD,EDIT,DELETE,PRINT',        sortOrder: 6  },
  { key: 'INGREDIENTS', label: 'Hammadde',           icon: 'fa-leaf',               color: 'text-green-500',   accentBg: 'bg-green-500/10',   actions: 'VIEW,ADD,EDIT,DELETE',              sortOrder: 7  },
  { key: 'RECIPES',     label: 'Reçete Yönetimi',    icon: 'fa-scroll',             color: 'text-orange-500',  accentBg: 'bg-orange-500/10',  actions: 'VIEW,ADD,EDIT,DELETE',              sortOrder: 8  },
  { key: 'SALES',       label: 'Satış / POS',        icon: 'fa-cash-register',      color: 'text-teal-500',    accentBg: 'bg-teal-500/10',    actions: 'VIEW,ADD,EDIT,DELETE,PRINT,APPROVE', sortOrder: 9 },
  { key: 'ORDERS',      label: 'Sipariş Yönetimi',   icon: 'fa-clipboard-list',     color: 'text-blue-600',    accentBg: 'bg-blue-600/10',    actions: 'VIEW,ADD,EDIT,DELETE,PRINT,APPROVE', sortOrder: 10 },
  { key: 'DELIVERY',    label: 'Paket Servis',       icon: 'fa-motorcycle',         color: 'text-rose-500',    accentBg: 'bg-rose-500/10',    actions: 'VIEW,ADD,EDIT,DELETE,APPROVE',      sortOrder: 11 },
  { key: 'COURIERS',    label: 'Kurye Yönetimi',     icon: 'fa-person-biking',      color: 'text-red-500',     accentBg: 'bg-red-500/10',     actions: 'VIEW,ADD,EDIT,DELETE',              sortOrder: 12 },
  { key: 'PRINTERS',    label: 'Yazıcı Yönetimi',    icon: 'fa-print',              color: 'text-slate-500',   accentBg: 'bg-slate-500/10',   actions: 'VIEW,ADD,EDIT,DELETE',              sortOrder: 13 },
  { key: 'FINANCE',     label: 'Finans / Kasa',      icon: 'fa-coins',              color: 'text-yellow-600',  accentBg: 'bg-yellow-500/10',  actions: 'VIEW,ADD,EDIT,DELETE,PRINT,APPROVE', sortOrder: 14 },
  { key: 'CARI',        label: 'Cari / Müşteri',     icon: 'fa-address-book',       color: 'text-lime-600',    accentBg: 'bg-lime-500/10',    actions: 'VIEW,ADD,EDIT,DELETE,PRINT',        sortOrder: 15 },
  { key: 'REPORTS',     label: 'Raporlar',           icon: 'fa-chart-pie',          color: 'text-red-500',     accentBg: 'bg-red-500/10',     actions: 'VIEW,PRINT',                        sortOrder: 16 },
  { key: 'KITCHEN',     label: 'Mutfak (KDS)',        icon: 'fa-utensils',           color: 'text-orange-600',  accentBg: 'bg-orange-600/10',  actions: 'VIEW,APPROVE',                      sortOrder: 17 },
  { key: 'WAITER',      label: 'Garson Paneli',      icon: 'fa-hand-holding-heart', color: 'text-pink-500',    accentBg: 'bg-pink-500/10',    actions: 'VIEW,ADD,EDIT',                     sortOrder: 18 },
  { key: 'USERS',       label: 'Kullanıcı Yönetimi', icon: 'fa-users-gear',         color: 'text-slate-700',   accentBg: 'bg-slate-500/10',   actions: 'VIEW,ADD,EDIT,DELETE',              sortOrder: 19 },
  { key: 'ROLES',       label: 'Rol Yönetimi',       icon: 'fa-user-shield',        color: 'text-pink-600',    accentBg: 'bg-pink-600/10',    actions: 'VIEW,ADD,EDIT,DELETE',              sortOrder: 20 },
  { key: 'INVOICES',    label: 'Fatura Yönetimi',    icon: 'fa-file-invoice',       color: 'text-indigo-600',  accentBg: 'bg-indigo-500/10',  actions: 'VIEW,ADD,EDIT,DELETE',              sortOrder: 21 },
  { key: 'ALERTS',      label: 'Bildirim Yönetimi',  icon: 'fa-bell-on',            color: 'text-rose-600',    accentBg: 'bg-rose-500/10',   actions: 'VIEW,ADD,EDIT,DELETE',              sortOrder: 22 },
];

@Injectable()
export class PermissionModulesService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(PermModule)
    private readonly repo: Repository<PermModule>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Runs once on app start:
   * 1. Creates the table if it doesn't exist (MSSQL compatible)
   * 2. Seeds default modules if table is empty
   */
  async onApplicationBootstrap() {
    try {
      await this.ensureTable();
      await this.seedDefaults();
    } catch (err) {
      console.error('[PermissionModules] Bootstrap error:', err?.message || err);
    }
  }

  private async ensureTable() {
    const sql = `
      IF NOT EXISTS (
        SELECT * FROM sysobjects
        WHERE name = 'permission_modules' AND xtype = 'U'
      )
      BEGIN
        CREATE TABLE permission_modules (
          id          INT IDENTITY(1,1) PRIMARY KEY,
          [key]       NVARCHAR(100)  NOT NULL UNIQUE,
          label       NVARCHAR(200)  NOT NULL,
          icon        NVARCHAR(100)  NOT NULL DEFAULT 'fa-cube',
          color       NVARCHAR(100)  NOT NULL DEFAULT 'text-blue-500',
          accent_bg   NVARCHAR(100)  NOT NULL DEFAULT 'bg-blue-500/10',
          actions     NVARCHAR(500)  NOT NULL DEFAULT 'VIEW',
          sort_order  INT            NOT NULL DEFAULT 99,
          createdAt   DATETIME2      NOT NULL DEFAULT GETDATE(),
          updatedAt   DATETIME2      NOT NULL DEFAULT GETDATE()
        )
      END
    `;
    await this.dataSource.query(sql);
    console.log('[PermissionModules] Table ready.');
  }

  private async seedDefaults() {
    for (const mod of DEFAULT_MODULES) {
      const existing = await this.repo.findOne({ where: { key: mod.key } });
      if (!existing) {
        const entity = this.repo.create(mod);
        await this.repo.save(entity);
        console.log(`[PermissionModules] Added missing module: ${mod.key}`);
      }
    }
    console.log(`[PermissionModules] Module sync completed.`);
  }

  async findAll(): Promise<PermModule[]> {
    return this.repo.find({ order: { sortOrder: 'ASC' } });
  }

  async findOne(id: number): Promise<PermModule> {
    const mod = await this.repo.findOne({ where: { id } });
    if (!mod) throw new NotFoundException(`PermModule ${id} not found`);
    return mod;
  }

  async create(dto: Partial<PermModule>): Promise<PermModule> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(id: number, dto: Partial<PermModule>): Promise<PermModule> {
    const entity = await this.findOne(id);
    this.repo.merge(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
  }

  async resetToDefaults(): Promise<void> {
    await this.repo.clear();
    for (const mod of DEFAULT_MODULES) {
      const entity = this.repo.create(mod);
      await this.repo.save(entity);
    }
  }
}
