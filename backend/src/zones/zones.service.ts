import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Zone } from './zone.entity';
import { ZoneMapping } from './zone-mapping.entity';
import { UsersService } from '../users/users.service';
import { getCachedPerms } from '../auth/permissions.guard';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
    @InjectRepository(ZoneMapping)
    private zoneMappingRepository: Repository<ZoneMapping>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {}

  private zonesCache: Zone[] | null = null;

  async findAll(userId?: number): Promise<Zone[]> {
    let allZones: Zone[];
    
    if (this.zonesCache) {
        allZones = this.zonesCache;
    } else {
        allZones = await this.zoneRepository.find({
            relations: ['location', 'tables'],
        });
        this.zonesCache = allZones;
    }

    let allowedZoneIds: number[] | 'ALL' = 'ALL';

    if (userId) {
      let roleName: string | undefined;
      let extraPerms: string[] = [];

      const cached = getCachedPerms(userId);
      if (cached) {
        roleName = cached.roleName;
        extraPerms = cached.allUserPerms;
      } else {
        const user = await this.usersService.findOne(userId);
        roleName = user?.role?.name?.toUpperCase();
        extraPerms = user?.extraPermissions || [];
      }

      if (roleName !== 'ADMIN' && roleName !== 'ADMINISTRATOR') {
        allowedZoneIds = extraPerms
          .filter(p => p.startsWith('ZONE:'))
          .map(p => parseInt(p.split(':')[1]))
          .filter(id => !isNaN(id));
      }
    }

    if (allowedZoneIds === 'ALL') {
      return allZones;
    }

    if (allowedZoneIds.length === 0) {
      return [];
    }

    return allZones.filter(z => (allowedZoneIds as number[]).includes(z.id));
  }

  private clearCache() {
    this.zonesCache = null;
  }

  async findOne(id: number): Promise<Zone> {
    const zone = await this.zoneRepository.findOne({
      where: { id },
      relations: ['location', 'tables'],
    });
    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }
    return zone;
  }

  async create(zoneData: Partial<Zone>): Promise<Zone> {
    const newZone = this.zoneRepository.create(zoneData);
    const saved = await this.zoneRepository.save(newZone);
    this.clearCache();
    return saved;
  }

  async update(id: number, updateData: Partial<Zone>): Promise<Zone> {
    const zone = await this.findOne(id);
    const { id: _, location, tables, ...data } = updateData as any;
    this.zoneRepository.merge(zone, data);
    const saved = await this.zoneRepository.save(zone);
    this.clearCache();
    return saved;
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.zoneRepository.delete(id);
    this.clearCache();
  }

  async getMappings(zoneId: number): Promise<ZoneMapping[]> {
    return this.zoneMappingRepository.find({
      where: { zoneId },
      relations: ['productType', 'warehouse', 'printer1', 'printer2', 'printer3'],
    });
  }

  async saveMappings(zoneId: number, mappingsData: Partial<ZoneMapping>[]): Promise<ZoneMapping[]> {
    await this.findOne(zoneId); // Ensure zone exists
    
    // Begin transaction to replace mappings
    return await this.zoneMappingRepository.manager.transaction(async (manager) => {
      // Delete existing mappings
      await manager.delete(ZoneMapping, { zoneId });
      
      if (!mappingsData || mappingsData.length === 0) {
        return [];
      }

      // Create new mappings
      const newMappings = manager.create(ZoneMapping, mappingsData.map(data => ({
        zoneId,
        productTypeId: data.productTypeId,
        warehouseId: data.warehouseId || null,
        printer1Id: data.printer1Id || null,
        printer2Id: data.printer2Id || null,
        printer3Id: data.printer3Id || null,
      } as any)));

      return await manager.save(ZoneMapping, newMappings);
    });
  }
}
