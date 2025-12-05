import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SyncLogStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export enum SyncLogType {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
  WEBHOOK = 'webhook'
}

@Entity('sync_logs')
export class SyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SyncLogType,
    default: SyncLogType.AUTOMATIC
  })
  type: SyncLogType;

  @Column({
    type: 'enum',
    enum: SyncLogStatus
  })
  status: SyncLogStatus;

  @Column({ type: 'varchar', length: 255 })
  operation: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nunota: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  pedido_id: string;

  @Column({ type: 'jsonb', nullable: true })
  request_data: any;

  @Column({ type: 'jsonb', nullable: true })
  response_data: any;

  @Column({ type: 'jsonb', nullable: true })
  error_details: any;

  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @Column({ type: 'int', nullable: true })
  execution_time_ms: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}