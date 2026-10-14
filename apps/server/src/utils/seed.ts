import '../config/dns';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { seedCatalogueData } from '../seed/seedData';
import { logger } from '../middleware/logger';

async function runSeed() {
  await connectDatabase();
  const result = await seedCatalogueData();
  logger.info('Seeded FixMe.com catalogue & compatibility records', {
    categories: result.categories.length,
    brands: result.brands.length,
    devices: result.devices.length,
    parts: result.parts.length,
    listings: result.listings.length,
  });
  await mongoose.connection.close();
}

runSeed().catch((err) => {
  logger.error('Seed failed', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});

