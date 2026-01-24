import 'reflect-metadata';
import { AppDataSource, initDatabase } from '@/configs/database.config';
import { seedPermissions, seedRoles } from './role.seed';

async function runSeeds() {
  try {
    console.log('🔌 Connecting to database...');
    await initDatabase();
    
    console.log('🌱 Running database seeds...');
    
    await seedPermissions();
    await seedRoles();
    
    console.log('✅ All seeds completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

runSeeds();
