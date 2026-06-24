import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: Database | null = null;

export async function initDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  // Ensure directory exists if needed, but here it's root or relative
  const dbPath = path.resolve(process.cwd(), 'backlinks.db');

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON');

  // Create tables
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      total_urls INTEGER NOT NULL,
      indexed_count INTEGER DEFAULT 0,
      not_indexed_count INTEGER DEFAULT 0,
      redirected_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      current_url TEXT DEFAULT '',
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backlinks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      index_status TEXT NOT NULL,
      http_status INTEGER,
      redirect_url TEXT,
      checked_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
    );
  `);

  return dbInstance;
}

export async function getDb(): Promise<Database> {
  return initDb();
}
