import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

/**
 * Ensures all required tables and columns exist in the database.
 * This runs on server startup so the user doesn't need to manually run `npm run db:push`.
 */
export async function ensureSchema() {
  const client = await pool.connect();
  try {
    // --- Helper: check if a table exists ---
    const tableExists = async (tableName: string): Promise<boolean> => {
      const res = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
        [tableName]
      );
      return res.rows[0].exists;
    };

    // --- Helper: check if a column exists ---
    const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
      const res = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2)`,
        [tableName, columnName]
      );
      return res.rows[0].exists;
    };

    // --- 1. Ensure departments table ---
    if (!(await tableExists("departments"))) {
      console.log("[db] Creating departments table...");
      await client.query(`
        CREATE TABLE departments (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL
        )
      `);
    }

    // --- 2. Ensure persons table ---
    if (!(await tableExists("persons"))) {
      console.log("[db] Creating persons table...");
      await client.query(`
        CREATE TABLE persons (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          department_id INTEGER
        )
      `);
    }

    // --- 3. Ensure inventory_transactions has department column ---
    if (await tableExists("inventory_transactions")) {
      if (!(await columnExists("inventory_transactions", "department"))) {
        console.log("[db] Adding department column to inventory_transactions...");
        await client.query(`ALTER TABLE inventory_transactions ADD COLUMN department TEXT`);
      }
      if (!(await columnExists("inventory_transactions", "person_name"))) {
        console.log("[db] Adding person_name column to inventory_transactions...");
        await client.query(`ALTER TABLE inventory_transactions ADD COLUMN person_name TEXT`);
      }
    }

    console.log("[db] Schema check complete.");
  } catch (err) {
    console.error("[db] Schema migration error:", err);
  } finally {
    client.release();
  }
}
