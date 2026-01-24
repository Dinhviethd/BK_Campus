import { seedRoles, seedPermissions } from './role.seed';

export async function runSeeds() {
  console.log('Running database seeds...');
  
  await seedPermissions();
  await seedRoles();
  
  console.log('All seeds completed!');
}
