import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SyncStatusType {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused'
}

@Entity('sync_status')
export class SyncStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SyncStatusType
  })
  status: SyncStatusType;

  @Column({ type: 'timestamp', nullable: true })
  last_sync_start: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_sync_end: Date;

  @Column({ type: 'int', default: 0 })
  total_processed: number;

  @Column({ type: 'int', default: 0 })
  total_success: number;

  @Column({ type: 'int', default: 0 })
  total_errors: number;

  @Column({ type: 'int', default: 0 })
  total_warnings: number;

  @Column({ type: 'text', nullable: true })
  last_error_message: string;

  @Column({ type: 'jsonb', nullable: true })
  sync_summary: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}