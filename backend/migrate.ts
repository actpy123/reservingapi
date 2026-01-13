import dotenv from 'dotenv';
dotenv.config();

export default {
  uri: process.env.MIGRATE_MONGO_URI,
  collection: process.env.MIGRATE_MONGO_COLLECTION,
  migrationsPath: process.env.MIGRATE_MIGRATIONS_PATH,
  templatePath: process.env.MIGRATE_TEMPLATE_PATH,
  autosync: process.env.MIGRATE_AUTOSYNC === 'true',
};
