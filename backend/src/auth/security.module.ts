import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { PermissionsGuard } from './permissions.guard';

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    providers: [PermissionsGuard, Reflector],
    exports: [PermissionsGuard],
})
export class SecurityModule { }
