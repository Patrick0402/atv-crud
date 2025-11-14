import { Transaction } from '@/types/transaction';
import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { publish } from './pubsub';

import { ensureCategoriesTable } from './categories';
import { getCurrentUserId } from './session';
import { ensureUsersTable, getUserByEmail } from './users';

const DB_NAME = 'transactions.db';
const TABLE = 'transactions';

let dbInstance: SQLiteDatabase | null = null;

async function getDb(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDatabaseAsync(DB_NAME);
  try {
    await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
  } catch {}
  return dbInstance;
}

export async function ensureTable(): Promise<void> {
  const db = await getDb();
  // Ensure users and categories tables exist first so we can reference them via foreign key
  try {
    await ensureUsersTable();
  } catch {}
  try {
    await ensureCategoriesTable();
  } catch {}

  // Transactions table with FKs. category_id and user_id are NOT NULL and category deletion is restricted
  await db.execAsync(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    category_id TEXT NOT NULL,
    notes TEXT,
    user_id TEXT NOT NULL,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`);

  // Ensure schema migrations: if older table missing 'type' column, add it
  try {
    const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${TABLE});`);
    const hasType = info.some((c) => c.name === 'type');
    if (!hasType) {
      await db.execAsync(`ALTER TABLE ${TABLE} ADD COLUMN type TEXT;`);
    }
    const hasUser = info.some((c) => c.name === 'user_id');
    if (!hasUser) {
      await db.execAsync(`ALTER TABLE ${TABLE} ADD COLUMN user_id TEXT;`);
    }
  } catch (e) {
    // ignore migration errors but log to console
    // eslint-disable-next-line no-console
    console.warn('Schema migration check failed', e);
  }

  // Seed example data on first run (when table is empty)
  try {
    const rows = await db.getAllAsync<{ count: number }>(`SELECT COUNT(*) as count FROM ${TABLE};`);
    const count = (rows && rows[0] && (rows[0] as any).count) || 0;
    if (count === 0) {
      // Ensure a stable default user exists (pre-created) and seed transactions only for that user.
      const DEFAULT_USER_ID = 'default-user';
      const DEFAULT_USER_EMAIL = 'user@example.com';
      const DEFAULT_USER_NAME = 'Usuário';
      const DEFAULT_USER_PASSWORD = 'user123';

      // ensure default user exists via users helper (it will create if missing)
      try {
        await ensureUsersTable();
      } catch {}
      let demoUserId = DEFAULT_USER_ID;
      try {
        const u = await getUserByEmail(DEFAULT_USER_EMAIL);
        if (u && u.id) demoUserId = u.id;
        else {
          // fallback: insert directly
          await db.runAsync(`INSERT OR REPLACE INTO users (id, name, email, password) VALUES ($id, $name, $email, $password);`, {
            $id: demoUserId,
            $name: DEFAULT_USER_NAME,
            $email: DEFAULT_USER_EMAIL,
            $password: DEFAULT_USER_PASSWORD,
          });
        }
      } catch (e) {
        // on error, attempt direct insert
        try {
          await db.runAsync(`INSERT OR REPLACE INTO users (id, name, email, password) VALUES ($id, $name, $email, $password);`, {
            $id: demoUserId,
            $name: DEFAULT_USER_NAME,
            $email: DEFAULT_USER_EMAIL,
            $password: DEFAULT_USER_PASSWORD,
          });
        } catch {}
      }

      // ensure categories for the demo user and create 10 example transactions with category ids
      const categoriesMap: Record<string, string> = {};
      const ensureCategory = async (name: string) => {
        // create simple deterministic id for seeded categories
        const id = 'cat-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + demoUserId;
        await db.runAsync(`INSERT OR REPLACE INTO categories (id, name, user_id) VALUES ($id, $name, $uid);`, { $id: id, $name: name, $uid: demoUserId });
        categoriesMap[name] = id;
        return id;
      };

      // create some categories we will reference and then insert transactions
      const now = Date.now();
      const sampleData = [
        { title: 'Salário', amount: 4500, type: 'income', date: new Date(now - 15 * 24 * 3600 * 1000).toISOString(), category: 'Renda', notes: 'Pagamento mensal' },
        { title: 'Aluguel (fundos)', amount: 1200, type: 'income', date: new Date(now - 4 * 24 * 3600 * 1000).toISOString(), category: 'Renda', notes: 'Aluguel da casa dos fundos' },
        { title: 'Despesa médica', amount: 800, type: 'expense', date: new Date(now - 20 * 24 * 3600 * 1000).toISOString(), category: 'Saúde', notes: 'Dentista' },
        { title: 'Supermercado', amount: 230.5, type: 'expense', date: new Date(now - 12 * 24 * 3600 * 1000).toISOString(), category: 'Alimentação', notes: 'Compras semanais' },
        { title: 'Pipoca e ingresso', amount: 40, type: 'expense', date: new Date(now - 7 * 24 * 3600 * 1000).toISOString(), category: 'Lazer', notes: 'Cinema' },
        { title: 'Fliperama', amount: 30, type: 'expense', date: new Date(now - 8 * 24 * 3600 * 1000).toISOString(), category: 'Lazer', notes: 'Jogos' },
        { title: 'Vendas mensais', amount: 180, type: 'income', date: new Date(now - 1 * 24 * 3600 * 1000).toISOString(), category: 'Pequeno Negócio', notes: 'Venda da lojinha de artesanato' },
        { title: 'Hotel', amount: 420, type: 'expense', date: new Date(now - 2 * 24 * 3600 * 1000).toISOString(), category: 'Viagem', notes: 'Férias' },
        { title: 'Compra de material', amount: 130, type: 'expense', date: new Date(now - 14 * 24 * 3600 * 1000).toISOString(), category: 'Pequeno Negócio', notes: 'Material para artesanato' },
        { title: 'Academia', amount: 80, type: 'expense', date: new Date(now - 10 * 24 * 3600 * 1000).toISOString(), category: 'Serviços', notes: 'Pagamento mensal da academia' },
      ];

      // First create all categories (unique)
      const uniqueCats = Array.from(new Set(sampleData.map((s) => s.category || 'Sem categoria')));
      for (const name of uniqueCats) {
        try {
          await ensureCategory(name);
        } catch (e) {
          // log but continue
          // eslint-disable-next-line no-console
          console.warn('Failed to ensure category', name, e);
        }
      }

      // Then insert transactions referencing those categories
      for (let i = 0; i < sampleData.length; i++) {
        const s = sampleData[i];
        const catName = s.category || 'Sem categoria';
        const cid = categoriesMap[catName];
        if (!cid) {
          // fallback: try to create/get category synchronously
          try {
            const id = await ensureCategory(catName);
            // eslint-disable-next-line no-console
            console.warn('Category missing in map, ensured:', catName, id);
            // assign
            // cid = id // not allowed const - use temp
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('Failed to ensure category for transaction', catName, e);
          }
        }
        const id = String(Date.now() + i);
        try {
          await db.runAsync(
            `INSERT INTO ${TABLE} (id, title, amount, type, date, category_id, notes, user_id) VALUES ($id, $title, $amount, $type, $date, $category_id, $notes, $user_id);`,
            {
              $id: id,
              $title: s.title,
              $amount: s.amount,
              $type: s.type ?? 'income',
              $date: s.date,
              $category_id: categoriesMap[catName] ?? null,
              $notes: s.notes ?? null,
              $user_id: demoUserId,
            }
          );
        } catch (e) {
          // log and continue, so one failing insert doesn't abort the whole seeding
          // eslint-disable-next-line no-console
          console.warn('Failed to insert seeded transaction', s.title, e);
        }
      }
      try {
        publish('transactions:changed');
      } catch {}
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Seeding check failed', e);
  }
}

export async function getTransactions(userId?: string): Promise<Transaction[]> {
  await ensureTable();
  const db = await getDb();
  // if no userId provided, try to resolve current session
  let uid = userId;
  if (!uid) {
    try {
      uid = (await getCurrentUserId()) ?? undefined;
    } catch {}
  }
  const rows = uid
    ? await db.getAllAsync<any>(`SELECT * FROM ${TABLE} WHERE user_id = $uid ORDER BY date DESC;`, { $uid: uid })
    : await db.getAllAsync<any>(`SELECT * FROM ${TABLE} ORDER BY date DESC;`);
  const mapped = (rows || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    amount: r.amount,
    type: r.type,
    date: r.date,
    categoryId: r.category_id,
    notes: r.notes,
    userId: r.user_id,
  } as Transaction));
  return mapped;
}

export async function addTransaction(t: Omit<Transaction, 'id'> | Transaction, userId?: string): Promise<Transaction> {
  await ensureTable();
  const db = await getDb();
  const payload = t as Transaction;
  const id = payload.id ?? Date.now().toString();
  let uid = userId;
  if (!uid) {
    try {
      uid = (await getCurrentUserId()) ?? undefined;
    } catch {}
  }
  const params: Record<string, any> = {
    $id: id,
    $title: payload.title ?? 'Untitled',
    $amount: typeof payload.amount === 'number' ? payload.amount : Number(payload.amount) || 0,
    $type: payload.type ?? 'income',
    $date: payload.date ?? new Date().toISOString(),
    $category_id: (payload as any).categoryId ?? null,
    $notes: payload.notes ?? null,
    $user_id: uid ?? null,
  };
  await db.runAsync(
    `INSERT OR REPLACE INTO ${TABLE} (id, title, amount, type, date, category_id, notes, user_id) VALUES ($id, $title, $amount, $type, $date, $category_id, $notes, $user_id);`,
    params
  );
  try {
    publish('transactions:changed');
  } catch {}
  return { ...(payload as any), id, userId: uid } as Transaction;
}

export async function updateTransaction(updated: Transaction): Promise<void> {
  await ensureTable();
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${TABLE} SET title = $title, amount = $amount, type = $type, date = $date, category_id = $category_id, notes = $notes, user_id = $user_id WHERE id = $id;`,
    {
      $title: updated.title,
      $amount: updated.amount,
      $type: updated.type ?? 'income',
      $date: updated.date,
      $category_id: (updated as any).categoryId ?? null,
      $notes: updated.notes ?? null,
      $user_id: (updated as any).userId ?? null,
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

export async function getTransactionsByCategory(userId: string, categoryId: string): Promise<Transaction[]> {
  await ensureTable();
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM ${TABLE} WHERE user_id = $uid AND category_id = $cid ORDER BY date DESC;`, { $uid: userId, $cid: categoryId });
  return (rows || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    amount: r.amount,
    type: r.type,
    date: r.date,
    categoryId: r.category_id,
    notes: r.notes,
    userId: r.user_id,
  } as Transaction));
}

export async function reassignCategory(oldCategoryId: string, newCategoryId: string, userId: string): Promise<void> {
  await ensureTable();
  const db = await getDb();
  await db.runAsync(`UPDATE ${TABLE} SET category_id = $new WHERE category_id = $old AND user_id = $uid;`, { $new: newCategoryId, $old: oldCategoryId, $uid: userId });
  try {
    publish('transactions:changed');
  } catch {}
}

