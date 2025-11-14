import { User } from '@/types/user';
import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';

const DB_NAME = 'transactions.db';
const TABLE = 'users';
let dbInstance: SQLiteDatabase | null = null;

async function getDb(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDatabaseAsync(DB_NAME);
  return dbInstance;
}

export async function ensureUsersTable(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
  );`);

  // Ensure a default demo user exists so login works immediately
  try {
    const DEFAULT_USER_ID = 'default-user';
    const DEFAULT_USER_EMAIL = 'user@example.com';
    const DEFAULT_USER_NAME = 'Usuário';
    const DEFAULT_USER_PASSWORD = 'user123';
    const rows = await db.getAllAsync<{ id: string }>(`SELECT id FROM ${TABLE} WHERE lower(email) = $email LIMIT 1;`, { $email: DEFAULT_USER_EMAIL.toLowerCase() });
    if (!rows || rows.length === 0) {
      await db.runAsync(`INSERT OR REPLACE INTO ${TABLE} (id, name, email, password) VALUES ($id, $name, $email, $password);`, {
        $id: DEFAULT_USER_ID,
        $name: DEFAULT_USER_NAME,
        $email: DEFAULT_USER_EMAIL,
        $password: DEFAULT_USER_PASSWORD,
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to ensure default user', e);
  }
}

export async function createUser({ id, name, email, password } : { id: string; name: string; email: string; password: string; }): Promise<void> {
  await ensureUsersTable();
  const db = await getDb();
  // NOTE: passwords stored in plain text for demo purposes. Use hashing in production.
  const storedEmail = String(email ?? '').trim().toLowerCase();
  await db.runAsync(`INSERT OR REPLACE INTO ${TABLE} (id, name, email, password) VALUES ($id, $name, $email, $password);`, {
    $id: id,
    $name: name,
    $email: storedEmail,
    $password: password,
  });
}

export async function getUserByEmail(email: string): Promise<(User & { password: string }) | null> {
  await ensureUsersTable();
  const db = await getDb();
  const storedEmail = String(email ?? '').trim().toLowerCase();
  const rows = await db.getAllAsync<{ id: string; name: string; email: string; password: string }>(`SELECT id, name, email, password FROM ${TABLE} WHERE lower(email) = $email LIMIT 1;`, { $email: storedEmail });
  if (!rows || rows.length === 0) return null;
  return rows[0];
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureUsersTable();
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; name: string; email: string }>(`SELECT id, name, email FROM ${TABLE} WHERE id = $id LIMIT 1;`, { $id: id });
  if (!rows || rows.length === 0) return null;
  return rows[0];
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  // Plain-text compare for demo. Replace with secure comparison/hashing in real apps.
  if (user.password !== password) return null;
  return { id: user.id, name: user.name, email: user.email } as User;
}

export default {
  ensureUsersTable,
  createUser,
  getUserByEmail,
  getUserById,
  authenticateUser,
};
