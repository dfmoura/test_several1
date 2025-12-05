import { DataSource } from 'typeorm';
import { config } from './environment';
import { SyncLog } from '../models/SyncLog';
import { SyncStatus } from '../models/SyncStatus';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.database.url,
  synchronize: config.env === 'development',
  logging: config.debug,
  entities: [SyncLog, SyncStatus],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    // Skip database initialization in WebContainer environment
    if (process.env.NODE_ENV === 'development' && !process.env.FORCE_DB_INIT) {
      console.log('⚠️ Database initialization skipped in development mode');
      console.log('💡 Using Supabase for data storage instead');
      return;
    }
    
    await AppDataSource.initialize();
    console.log('✅ Database connection established');
  } catch (error) {
    console.warn('⚠️ Database connection failed, continuing without local DB:', error.message);
    console.log('💡 Application will use Supabase for data storage');
    // Don't throw error, allow app to continue with Supabase
  }
};