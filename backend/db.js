import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'expenses.json');

// Memory cache for fast reads and sync checks
let expensesCache = null;

// Initialize db directory and file if they don't exist
async function ensureDbInitialized() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // Ignore if directory already exists
  }

  try {
    await fs.access(DATA_FILE);
  } catch (err) {
    // File doesn't exist, create it with an empty array
    await writeAtomic([]);
  }
}

// Atomic file write to avoid corruption
async function writeAtomic(data) {
  const tmpFile = `${DATA_FILE}.tmp`;
  const jsonString = JSON.stringify(data, null, 2);
  
  // Write to temporary file
  await fs.writeFile(tmpFile, jsonString, 'utf-8');
  // Rename temp file to destination (atomic operation on OS level)
  await fs.rename(tmpFile, DATA_FILE);
}

// Load expenses into cache if not loaded
async function loadExpenses() {
  if (expensesCache !== null) {
    return expensesCache;
  }
  
  await ensureDbInitialized();
  
  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    expensesCache = JSON.parse(content || '[]');
  } catch (error) {
    console.error('Failed to read database file, initializing empty cache:', error);
    expensesCache = [];
  }
  
  return expensesCache;
}

/**
 * Get all expenses.
 */
export async function getExpenses() {
  return await loadExpenses();
}

/**
 * Add a new expense with built-in idempotency protection.
 * If the idempotencyKey already exists, returns the existing record instead of adding a duplicate.
 * 
 * @returns {Object} { expense: Object, isDuplicate: boolean }
 */
export async function addExpense(expenseData) {
  const expenses = await loadExpenses();
  
  // Idempotency check: look for matching key
  if (expenseData.idempotencyKey) {
    const existing = expenses.find(e => e.idempotencyKey === expenseData.idempotencyKey);
    if (existing) {
      console.log(`Idempotency hit! Request with key ${expenseData.idempotencyKey} already exists. Returning original.`);
      return { expense: existing, isDuplicate: true };
    }
  }
  
  // Format details
  const newExpense = {
    id: crypto.randomUUID(),
    amount: expenseData.amount, // stored as cents integer
    category: expenseData.category,
    description: expenseData.description || '',
    date: expenseData.date, // Format: YYYY-MM-DD
    createdAt: new Date().toISOString(),
    idempotencyKey: expenseData.idempotencyKey || null
  };
  
  expenses.push(newExpense);
  await writeAtomic(expenses);
  expensesCache = expenses; // update cache
  
  return { expense: newExpense, isDuplicate: false };
}

/**
 * Delete an expense by ID.
 * @param {string} id - UUID of the expense to delete.
 * @returns {boolean} true if deleted, false if not found.
 */
export async function deleteExpense(id) {
  const expenses = await loadExpenses();
  const index = expenses.findIndex(e => e.id === id);

  if (index === -1) {
    return false;
  }

  expenses.splice(index, 1);
  await writeAtomic(expenses);
  expensesCache = expenses; // update cache
  return true;
}
