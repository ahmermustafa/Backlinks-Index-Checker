import Database from 'better-sqlite3';
import path from 'path';

type RunResult = { lastID?: number; changes: number };

class DbWrapper {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // Mimic sqlite's db.run(sql, params) -> Promise<{ lastID, changes }>
  async run(sql: string, params: any[] = []): Promise<RunResult> {
    const stmt = this.db.prepare(sql);
    const info = stmt.run(...params);
    return {
      lastID: Number(info.lastInsertRowid),
      changes: info.changes
    };
  }

  // Mimic sqlite's db.all(sql, params) -> Promise<any[]>
  async all(sql: string, params: any[] = []): Promise<any[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  // Mimic sqlite's db.get(sql, params) -> Promise<any>
  async get(sql: string, params: any[] = []): Promise<any> {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  // Mimic sqlite's db.exec(sql) -> Promise<void>
  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }
}

let dbInstance: DbWrapper | null = null;

export async function initDb(): Promise<DbWrapper> {
  if (dbInstance) return dbInstance;

  const dbPath = path.resolve(process.cwd(), 'backlinks.db');
  const rawDb = new Database(dbPath);

  // Enable foreign keys
  rawDb.pragma('foreign_keys = ON');

  dbInstance = new DbWrapper(rawDb);

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

export async function getDb(): Promise<DbWrapper> {
  return initDb();
}
