import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';

const DB_NAME = 'transactions.db';
let dbInstance: SQLiteDatabase | null = null;

async function getDb(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDatabaseAsync(DB_NAME);
  try {
    await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
  } catch {}
  return dbInstance;
}

export async function ensureSessionTable(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`CREATE TABLE IF NOT EXISTS session (key TEXT PRIMARY KEY NOT NULL, value TEXT);`);
}

export async function setCurrentUserId(id: string | null): Promise<void> {
  const db = await getDb();
  await ensureSessionTable();
  if (id === null) {
    await db.runAsync(`DELETE FROM session WHERE key = $key;`, { $key: 'currentUser' });
  } else {
    await db.runAsync(`INSERT OR REPLACE INTO session (key, value) VALUES ($key, $value);`, { $key: 'currentUser', $value: id });
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const db = await getDb();
  await ensureSessionTable();
  const rows = await db.getAllAsync<{ value: string }>(`SELECT value FROM session WHERE key = $key LIMIT 1;`, { $key: 'currentUser' });
  if (!rows || rows.length === 0) return null;
  return rows[0].value || null;
}

export async function clearSession(): Promise<void> {
  return setCurrentUserId(null);
}

export default {
  getCurrentUserId,
  setCurrentUserId,
  clearSession,
};
