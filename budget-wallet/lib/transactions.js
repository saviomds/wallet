import { supabase } from '../lib/supabase';

// Step 4: Add Transaction Function
export async function addTransaction(transactionData) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('You must be logged in to add a transaction.');
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert([{ ...transactionData, user_id: user.id }])
    .select(); // Select returns the newly created row

  if (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
  return data;
}

// Fetch all transactions to populate the UI (Step 5)
export async function getTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false }); // Newest first

  if (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
  return data;
}

// Step 6: Balance Logic
export function getSummary(transactions = []) {
  const categoryTotals = {};
  
  const result = transactions.reduce(
    (summary, curr) => {
      const amount = parseFloat(curr.amount) || 0;
      if (curr.type === 'income') summary.income += amount;
      if (curr.type === 'expense') {
        summary.expenses += amount;
        const cat = curr.category || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
      }
      summary.balance = summary.income - summary.expenses;
      return summary;
    },
    { balance: 0, income: 0, expenses: 0, biggestCategory: '', biggestCategoryAmount: 0 }
  );

  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (amt > result.biggestCategoryAmount) {
      result.biggestCategoryAmount = amt;
      result.biggestCategory = cat;
    }
  }

  return result;
}

// Step 8: Delete Transaction
export async function deleteTransaction(id) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
}

// Step 9: User Settings (Goals & Budgets)
export async function getUserSettings() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is the "0 rows returned" error
    console.error('Error fetching settings:', error.message || error);
  }
  return data || { savings_goal: 0, category_budgets: {} };
}

export async function updateUserSettings(settings) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('You must be logged in.');

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, ...settings, updated_at: new Date().toISOString() });

  if (error) {
    console.error('Error updating settings:', error.message || error);
    throw error;
  }
}

// Step 10: Update Transaction
export async function updateTransaction(id, transactionData) {
  const { error } = await supabase
    .from('transactions')
    .update(transactionData)
    .eq('id', id);

  if (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
}