import express from 'express';
import cors from 'cors';
import { getExpenses, addExpense, deleteExpense } from './db.js';

// PORT and HOST are loaded from .env via `node --env-file=.env` (Node 20.6+)
const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';


// Enable CORS for frontend integration
app.use(cors({
  origin: '*', // For this local exercise, allow all origins
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Idempotency-Key']
}));

app.use(express.json());

// Middleware for simulating network delays or errors if requested via headers
// This makes it easy to demo or test resiliency directly via API requests
app.use((req, res, next) => {
  const simulateSlow = req.headers['x-simulate-slow'];
  const simulateError = req.headers['x-simulate-error'];

  if (simulateError && Math.random() < 0.4) {
    console.warn(`[SIMULATION] Injecting network error for ${req.method} ${req.url}`);
    return res.status(503).json({ error: 'Service Unavailable (Simulated Network Error)' });
  }

  if (simulateSlow) {
    const delay = parseInt(simulateSlow, 10) || 2000;
    console.log(`[SIMULATION] Injecting ${delay}ms delay for ${req.method} ${req.url}`);
    return setTimeout(next, delay);
  }

  next();
});

// Category definition validation list
const VALID_CATEGORIES = [
  'Food',
  'Utilities',
  'Entertainment',
  'Transport',
  'Housing',
  'Health',
  'Education',
  'Others'
];

// Helper: Validate ISO date format YYYY-MM-DD
function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * GET /expenses
 * Returns a list of expenses.
 * Optional query parameters:
 * - category: string (filter by category)
 * - sort: string (sort order, defaults to 'date_desc'. Supports 'date_desc' or 'date_asc')
 */
app.get('/expenses', async (req, res) => {
  try {
    let expenses = await getExpenses();
    const { category, sort } = req.query;

    // 1. Filter by category
    if (category) {
      const targetCategory = category.toLowerCase();
      expenses = expenses.filter(e => e.category.toLowerCase() === targetCategory);
    }

    // 2. Sort by date (default to newest first)
    const sortOrder = sort || 'date_desc';
    expenses.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      
      if (dateA !== dateB) {
        return sortOrder === 'date_desc' ? dateB - dateA : dateA - dateB;
      }
      
      // Secondary sort: creation timestamp
      const createA = new Date(a.createdAt).getTime();
      const createB = new Date(b.createdAt).getTime();
      return sortOrder === 'date_desc' ? createB - createA : createA - createB;
    });

    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /expenses/summary
 * Returns a total amount and sum per category.
 */
app.get('/expenses/summary', async (req, res) => {
  try {
    const expenses = await getExpenses();
    
    let totalCents = 0;
    const categoryTotals = {};
    
    // Initialize category totals
    VALID_CATEGORIES.forEach(cat => {
      categoryTotals[cat] = 0;
    });
    
    expenses.forEach(e => {
      totalCents += e.amount;
      const cat = VALID_CATEGORIES.includes(e.category) ? e.category : 'Others';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
    });

    res.json({
      totalCents,
      categoryTotals,
      totalCount: expenses.length
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /expenses
 * Create a new expense.
 * Validates request body, parses amount to cents, and uses idempotency-key to prevent duplicates.
 */
app.post('/expenses', async (req, res) => {
  try {
    const { amount, category, description, date } = req.body;
    
    // Idempotency Key can be passed in Headers or Body
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

    const errors = [];

    // 1. Amount validation (must be positive number, can be decimal like 12.50)
    if (amount === undefined || amount === null || typeof amount !== 'number' || isNaN(amount)) {
      errors.push('Amount is required and must be a valid number.');
    } else if (amount <= 0) {
      errors.push('Amount must be a positive number greater than 0.');
    }

    // 2. Category validation
    if (!category || typeof category !== 'string' || !VALID_CATEGORIES.includes(category)) {
      errors.push(`Category is required and must be one of: ${VALID_CATEGORIES.join(', ')}.`);
    }

    // 3. Date validation
    if (!date || !isValidDate(date)) {
      errors.push('Date is required and must be in YYYY-MM-DD format.');
    }

    // 4. Description validation (length check)
    if (description && typeof description === 'string' && description.length > 255) {
      errors.push('Description cannot exceed 255 characters.');
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Convert decimal amount (e.g. 10.53) to integer cents (e.g. 1053) to prevent float issues.
    // We round to make sure we don't end up with fraction-cents due to Javascript floating arithmetic.
    const amountInCents = Math.round(amount * 100);

    const expenseData = {
      amount: amountInCents,
      category,
      description: description || '',
      date,
      idempotencyKey: idempotencyKey || null
    };

    // Save to Database
    const { expense, isDuplicate } = await addExpense(expenseData);

    if (isDuplicate) {
      // Return 200 OK for idempotency cache hits, with custom header
      res.setHeader('X-Cache-Lookup', 'HIT - IDEMPOTENCY');
      return res.status(200).json(expense);
    }

    res.status(201).json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /expenses/:id
 * Delete a single expense by its UUID.
 * Returns 204 No Content on success, 404 if the expense does not exist.
 */
app.delete('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid expense ID.' });
    }

    const deleted = await deleteExpense(id);

    if (!deleted) {
      return res.status(404).json({ error: `Expense with id '${id}' not found.` });
    }

    res.status(204).send(); // No Content
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`Expense Tracker Backend is running at http://${HOST}:${PORT}`);
});
