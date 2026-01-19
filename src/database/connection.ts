import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production' || isVercel;

// Turso configuration for production
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

export interface DatabaseClient {
  prepare: (sql: string) => any;
  exec: (sql: string) => any;
  pragma: (sql: string) => any;
  close?: () => void;
}

let db: DatabaseClient;

if (isProduction && tursoUrl && tursoAuthToken) {
  // Use Turso for production
  console.log('🌐 Using Turso database for production');
  
  const turso = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
  });

  // Wrapper to make Turso compatible with better-sqlite3 API
  db = {
    prepare: (sql: string) => ({
      run: (...params: any[]) => {
        return turso.execute({ sql, args: params }).then(result => ({
          changes: result.rowsAffected,
          lastInsertRowid: result.lastInsertRowid,
        }));
      },
      get: (...params: any[]) => {
        return turso.execute({ sql, args: params }).then(result => result.rows[0]);
      },
      all: (...params: any[]) => {
        return turso.execute({ sql, args: params }).then(result => result.rows);
      },
    }),
    exec: (sql: string) => {
      return turso.batch(
        sql
          .split(';')
          .filter(s => s.trim())
          .map(s => ({ sql: s.trim(), args: [] }))
      );
    },
    pragma: (sql: string) => {
      // Turso doesn't support pragma, but we can safely ignore it
      console.log(`⚠️ Pragma not supported in Turso: ${sql}`);
      return Promise.resolve();
    },
  };
} else {
  // Use local SQLite for development
  console.log('💾 Using local SQLite database for development');
  
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'bot.db');
  
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const localDb = new Database(dbPath);
  
  // Wrapper to make async
  db = {
    prepare: (sql: string) => {
      const stmt = localDb.prepare(sql);
      return {
        run: (...params: any[]) => Promise.resolve(stmt.run(...params)),
        get: (...params: any[]) => Promise.resolve(stmt.get(...params)),
        all: (...params: any[]) => Promise.resolve(stmt.all(...params)),
      };
    },
    exec: (sql: string) => Promise.resolve(localDb.exec(sql)),
    pragma: (sql: string) => Promise.resolve(localDb.pragma(sql)),
    close: () => localDb.close(),
  };
}

export default db;
