import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Zone } from './zone.entity';
import { UsersService } from '../users/users.service';
import { getCachedPerms } from '../auth/permissions.guard';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
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
}
