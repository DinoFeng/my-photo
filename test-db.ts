import 'reflect-metadata';
import { AppDataSource } from './server/db/index.js';

async function test() {
  console.log('Testing database connection...');
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully!');
    console.log('Entities:', AppDataSource.entityMetadatas.map(e => e.name));
    await AppDataSource.destroy();
    console.log('Test completed.');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

test();
