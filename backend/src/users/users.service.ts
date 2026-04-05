import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({ relations: ['role', 'firm'] });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'firm'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: ['role', 'firm'],
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { phone },
      relations: ['role', 'firm'],
    });
  }

  async findWaiters(): Promise<Partial<User>[]> {
    return await this.userRepository.find({
      where: [{ role: { name: 'Garson' } }, { role: { name: 'Waiter' } }],
      select: ['id', 'firstName', 'lastName'],
    });
  }

  async findCashiers(): Promise<Partial<User>[]> {
    return await this.userRepository.find({
      where: [
        { role: { name: 'Kasiyer' } },
        { role: { name: 'Cashier' } },
        { role: { name: 'Admin' } },
        { role: { name: 'Administrator' } },
      ],
      select: ['id', 'firstName', 'lastName'],
    });
  }

  async findByPin(id: number, pinCode: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id, pinCode },
      relations: ['role', 'firm'],
    });
  }

  async findByPinOnly(pinCode: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { pinCode },
      relations: ['role', 'firm'],
    });
  }

  /** Returns true if the PIN is not used by any other user (excludeId = current user's id) */
  async isPinUnique(pinCode: string, excludeUserId?: number): Promise<boolean> {
    const existing = await this.userRepository.findOne({ where: { pinCode } });
    if (!existing) return true;
    if (excludeUserId && existing.id === excludeUserId) return true;
    return false;
  }

  async create(userData: Partial<User>): Promise<User> {
    try {
      const newUser = this.userRepository.create(userData);
      if (userData.passwordHash) {
        newUser.passwordClearText = userData.passwordHash;
        newUser.passwordHash = await bcrypt.hash(userData.passwordHash, 10);
      }
      return await this.userRepository.save(newUser);
    } catch (error: any) {
      console.error('USER CREATE ERROR:', error);
      if (error.number === 2627 || error.number === 2601) {
        throw new BadRequestException(
          'Bu e-posta adresi sistemde zaten kayıtlı.',
        );
      }
      throw error;
    }
  }

  async update(id: number, updateData: Partial<User>): Promise<User> {
    await this.findOne(id);
    try {
      const user = await this.findOne(id);
      // PIN uniqueness check
      if (updateData.pinCode && updateData.pinCode.trim()) {
        const pinUnique = await this.isPinUnique(updateData.pinCode.trim(), id);
        if (!pinUnique) {
          throw new BadRequestException(
            'Bu PIN kodu başka bir kullanıcı tarafından kullanılıyor. Lütfen farklı bir PIN seçin.'
          );
        }
      }
      if (updateData.passwordHash) {
        user.passwordClearText = updateData.passwordHash;
        updateData.passwordHash = await bcrypt.hash(
          updateData.passwordHash,
          10,
        );
      }
      const { id: _, ...data } = updateData as any;
      this.userRepository.merge(user, data);
      return await this.userRepository.save(user);
    } catch (error: any) {
      console.error('USER UPDATE ERROR:', error);
      if (error.number === 2627 || error.number === 2601) {
        throw new BadRequestException(
          'Bu e-posta adresi sistemde zaten kayıtlı.',
        );
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.userRepository.delete(id);
  }

  async batchUpdateRole(userIds: number[], roleId: number): Promise<void> {
    if (!userIds || userIds.length === 0) return;
    await this.userRepository.update(userIds, { role: { id: roleId } } as any);
  }
}
