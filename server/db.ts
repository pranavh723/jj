import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as fs from "fs";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Get DATABASE_URL from /tmp/replitdb file or environment variable
// Replit stores the URL in /tmp/replitdb for published applications
function getDatabaseUrl(): string {
  // First try reading from /tmp/replitdb
  try {
    const dbUrl = fs.readFileSync('/tmp/replitdb', 'utf-8').trim();
    if (dbUrl) {
      return dbUrl;
    }
  } catch (error) {
    // File doesn't exist or can't be read, continue to environment variable
  }

  // Fall back to environment variable
  const envUrl = process.env.DATABASE_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Lazy initialization - only create connection when first accessed
let _pool: Pool | null = null;
let _db: any | null = null;

function getPool() {
  if (!_pool) {
    const DATABASE_URL = getDatabaseUrl();
    _pool = new Pool({ connectionString: DATABASE_URL });
  }
  return _pool;
}

function getDb() {
  if (!_db) {
    _db = drizzle({ client: getPool(), schema });
  }
  return _db;
}

export const pool = new Proxy({} as Pool, {
  get(target, prop) {
    return (getPool() as any)[prop];
  }
});

export const db = new Proxy({} as any, {
  get(target, prop) {
    return (getDb() as any)[prop];
  }
});