import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';

@Entity('modifiers')
export class Modifier {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    groupName: string;

    @Column({ nullable: true })
    modifierGroupId: number;

    @ManyToOne('ModifierGroup', 'modifiers', { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'modifierGroupId' })
    group: any;

    @Column({ default: false })
    isGeneral: boolean;

    @Column({ type: 'int', nullable: true })
    productTypeId: number | null;

    @ManyToOne('ProductType', { nullable: true, onDelete: 'NO ACTION' })
    @JoinColumn({ name: 'productTypeId' })
    productType: any;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    productCategory: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
