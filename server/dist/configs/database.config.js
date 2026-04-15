"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    entities: [__dirname + "/../modules/**/models/*.model.{ts,js}"],
    migrations: [__dirname + "/../migrations/*.{ts,js}"],
    synchronize: false,
});
const initDatabase = async () => {
    try {
        await exports.AppDataSource.initialize();
        console.log("✅ Connected to Supabase (Postgres)");
        const migrations = await exports.AppDataSource.runMigrations();
        if (migrations.length > 0) {
            console.log(`✅ Executed ${migrations.length} migration(s)`);
        }
    }
    catch (error) {
        console.error("❌ Failed to connect to Supabase");
        console.error(error);
        process.exit(1);
    }
};
exports.initDatabase = initDatabase;
