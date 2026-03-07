import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
        return await this.userRepository.find({ relations: ['role'] });
    }

    async findOne(id: number): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id }, relations: ['role'] });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findOne({ where: { email }, relations: ['role'] });
    }

    async findWaiters(): Promise<Partial<User>[]> {
        return await this.userRepository.find({
            where: [
                { role: { name: 'Garson' } },
                { role: { name: 'Waiter' } }
            ],
            select: ['id', 'firstName', 'lastName']
        });
    }

    async findCashiers(): Promise<Partial<User>[]> {
        return await this.userRepository.find({
            where: [
                { role: { name: 'Kasiyer' } },
                { role: { name: 'Cashier' } },
                { role: { name: 'Admin' } },
                { role: { name: 'Administrator' } }
            ],
            select: ['id', 'firstName', 'lastName']
        });
    }

    async findByPin(id: number, pinCode: string): Promise<User | null> {
        return await this.userRepository.findOne({ where: { id, pinCode }, relations: ['role'] });
    }

    async create(userData: Partial<User>): Promise<User> {
        try {
            const newUser = this.userRepository.create(userData);
            if (userData.passwordHash) {
                newUser.passwordHash = await bcrypt.hash(userData.passwordHash, 10);
            }
            return await this.userRepository.save(newUser);
        } catch (error: any) {
            console.error('USER CREATE ERROR:', error);
            if (error.number === 2627 || error.number === 2601) {
                throw new BadRequestException('Bu e-posta adresi sistemde zaten kayıtlı.');
            }
            throw error;
        }
    }

    async update(id: number, updateData: Partial<User>): Promise<User> {
        await this.findOne(id);
        try {
            const user = await this.findOne(id);
            if (updateData.passwordHash) {
                updateData.passwordHash = await bcrypt.hash(updateData.passwordHash, 10);
            }
            const { id: _, role, ...data } = updateData as any;
            this.userRepository.merge(user, data);
            return await this.userRepository.save(user);
        } catch (error: any) {
            console.error('USER UPDATE ERROR:', error);
            if (error.number === 2627 || error.number === 2601) {
                throw new BadRequestException('Bu e-posta adresi sistemde zaten kayıtlı.');
            }
            throw error;
        }
    }

    async remove(id: number): Promise<void> {
        await this.findOne(id);
        await this.userRepository.delete(id);
    }
}
