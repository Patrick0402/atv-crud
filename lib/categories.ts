import { publish } from '@/lib/pubsub';
import { ensureUsersTable } from '@/lib/users';
import { Category } from '@/types/category';
import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';

const DB_NAME = 'transactions.db';
const TABLE = 'categories';
let dbInstance: SQLiteDatabase | null = null;

async function getDb(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDatabaseAsync(DB_NAME);
  try {
    // ensure foreign keys are enabled for this connection
    await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
  } catch (e) {
    // ignore
  }
  return dbInstance;
}

export async function ensureCategoriesTable(): Promise<void> {
  // Ensure users table exists so FK can reference it
  try {
    await ensureUsersTable();
  } catch {}
  const db = await getDb();
  await db.execAsync(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`);
}

export async function getCategories(userId: string): Promise<Category[]> {
  await ensureCategoriesTable();
  const db = await getDb();
  const rows = await db.getAllAsync<Category>(`SELECT id, name, user_id as userId FROM ${TABLE} WHERE user_id = $uid ORDER BY name COLLATE NOCASE;`, { $uid: userId });
  return rows || [];
}

export async function createCategory(c: { id: string; name: string; userId: string }): Promise<void> {
  await ensureCategoriesTable();
  const db = await getDb();
  await db.runAsync(`INSERT OR REPLACE INTO ${TABLE} (id, name, user_id) VALUES ($id, $name, $user_id);`, {
    $id: c.id,
    $name: c.name,
    $user_id: c.userId,
  });
}

export async function getCategoryByName(name: string, userId: string): Promise<Category | null> {
  await ensureCategoriesTable();
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; name: string; user_id: string }>(`SELECT id, name, user_id FROM ${TABLE} WHERE lower(name) = $name AND user_id = $uid LIMIT 1;`, { $name: String(name ?? '').trim().toLowerCase(), $uid: userId });
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return { id: r.id, name: r.name, userId: r.user_id };
}

export async function getOrCreateCategoryByName(name: string, userId: string): Promise<Category> {
  const existing = await getCategoryByName(name, userId);
  if (existing) return existing;
  const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
  await createCategory({ id, name: name.trim(), userId });
  try {
    publish('categories:changed');
  } catch {}
  return { id, name: name.trim(), userId };
}

export async function updateCategory(c: Category): Promise<void> {
  await ensureCategoriesTable();
  const db = await getDb();
  await db.runAsync(`UPDATE ${TABLE} SET name = $name WHERE id = $id;`, { $name: c.name, $id: c.id });
}

export async function deleteCategory(id: string): Promise<void> {
  await ensureCategoriesTable();
  const db = await getDb();
  // prevent deleting a category that is referenced by any transaction
  try {
    const rows = await db.getAllAsync<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM transactions WHERE category_id = $id;`, { $id: id });
    const cnt = (rows && rows[0] && (rows[0] as any).cnt) || 0;
    if (cnt > 0) throw new Error('Category has transactions and cannot be deleted.');
  } catch (e) {
    // if the transactions table doesn't exist yet, allow deletion to proceed
    if ((e as any).message && String((e as any).message).includes('no such table')) {
      // continue
    } else if ((e as any).message === 'Category has transactions and cannot be deleted.') {
      throw e;
    }
  }

  await db.runAsync(`DELETE FROM ${TABLE} WHERE id = $id;`, { $id: id });
}

export async function getCategoryUsageCounts(userId: string): Promise<Record<string, number>> {
  await ensureCategoriesTable();
  const db = await getDb();
  try {
    const rows = await db.getAllAsync<{ category_id: string; cnt: number }>(
      `SELECT category_id, COUNT(*) as cnt FROM transactions WHERE user_id = $uid GROUP BY category_id;`,
      { $uid: userId }
    );
    const map: Record<string, number> = {};
    (rows || []).forEach((r) => {
      map[r.category_id] = r.cnt || 0;
    });
    return map;
  } catch (e) {
    // if transactions table doesn't exist, return empty map
    return {};
  }
}

export default {
  ensureCategoriesTable,
  getCategories,
  createCategory,
  getCategoryByName,
  getOrCreateCategoryByName,
  updateCategory,
  deleteCategory,
  getCategoryUsageCounts,
};
