import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
dotenv.config();
export const AppDataSource = new DataSource({
  type: "postgres",

  url: process.env.DATABASE_URL, 

  ssl: { rejectUnauthorized: false },

  entities: [__dirname + "/../models/*.{ts,js}"],
  migrations: [__dirname + "/../migrations/*.{ts,js}"],
  synchronize: false,
});


export const initDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log("✅ Connected to Supabase (Postgres)");

    const migrations = await AppDataSource.runMigrations();
    if (migrations.length > 0) {
      console.log(`✅ Executed ${migrations.length} migration(s)`);
    }
  } catch (error) {
    console.error("❌ Failed to connect to Supabase");
    console.error(error);
    process.exit(1);
  }
};
