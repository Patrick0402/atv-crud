export type Transaction = {
  id: string;
  title: string;
  amount: number; // absolute value
  type: 'income' | 'expense';
  date: string; // ISO date string
  categoryId: string;
  notes?: string;
  userId: string;
};
