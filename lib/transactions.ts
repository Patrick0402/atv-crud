import { Transaction } from '@/types/transaction';
import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { publish } from './pubsub';

const DB_NAME = 'transactions.db';
const TABLE = 'transactions';

let dbInstance: SQLiteDatabase | null = null;

async function getDb(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDatabaseAsync(DB_NAME);
  return dbInstance;
}

export async function ensureTable(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT,
    amount REAL,
    type TEXT,
    date TEXT,
    category TEXT,
    notes TEXT
  );`);

  // Ensure schema migrations: if older table missing 'type' column, add it
  try {
    const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${TABLE});`);
    const hasType = info.some((c) => c.name === 'type');
    if (!hasType) {
      await db.execAsync(`ALTER TABLE ${TABLE} ADD COLUMN type TEXT;`);
    }
  } catch (e) {
    // ignore migration errors but log to console
    // eslint-disable-next-line no-console
    console.warn('Schema migration check failed', e);
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  await ensureTable();
  const db = await getDb();
  const rows = await db.getAllAsync<Transaction>(`SELECT * FROM ${TABLE} ORDER BY date DESC;`);
  return rows || [];
}

export async function addTransaction(t: Omit<Transaction, 'id'> | Transaction): Promise<Transaction> {
  await ensureTable();
  const db = await getDb();
  const payload = t as Transaction;
  const id = payload.id ?? Date.now().toString();
  const params = {
    $id: id,
    $title: payload.title ?? 'Untitled',
    $amount: typeof payload.amount === 'number' ? payload.amount : Number(payload.amount) || 0,
    $type: payload.type ?? 'income',
    $date: payload.date ?? new Date().toISOString(),
    $category: payload.category ?? null,
    $notes: payload.notes ?? null,
  };
  await db.runAsync(
    `INSERT OR REPLACE INTO ${TABLE} (id, title, amount, type, date, category, notes) VALUES ($id, $title, $amount, $type, $date, $category, $notes);`,
    params
  );
  try {
    publish('transactions:changed');
  } catch {}
  return { ...(payload as any), id } as Transaction;
}

export async function updateTransaction(updated: Transaction): Promise<void> {
  await ensureTable();
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${TABLE} SET title = $title, amount = $amount, type = $type, date = $date, category = $category, notes = $notes WHERE id = $id;`,
    {
      $title: updated.title,
      $amount: updated.amount,
      $type: updated.type ?? 'income',
      $date: updated.date,
      $category: updated.category ?? null,
      $notes: updated.notes ?? null,
      $id: updated.id,
    }
  );
  try {
    publish('transactions:changed');
  } catch {}
}

export async function deleteTransaction(id: string): Promise<void> {
  await ensureTable();
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${TABLE} WHERE id = $id;`, { $id: id });
  try {
    publish('transactions:changed');
  } catch {}
}

