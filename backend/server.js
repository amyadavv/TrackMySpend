import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import { hashPassword, verifyPassword, generateToken, authenticateToken } from './middleware/auth.js';
import User from './models/User.js';
import Expense, { VALID_CATEGORIES } from './models/Expense.js';

// PORT is injected by the platform (Render sets it automatically) or falls back to 5000 locally.
// No HOST is passed to app.listen so Node defaults to 0.0.0.0 (all interfaces) — required by cloud platforms.
const app = express();
const PORT = process.env.PORT || 5000;


// Enable CORS for frontend integration
app.use(cors({
  origin: '*', // For this local exercise, allow all origins
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Idempotency-Key', 'Authorization']
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

// Helper: Validate ISO date format YYYY-MM-DD
function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH ROUTES (public — no token required)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /auth/register
 * Create a new user account. Returns a JWT on success.
 */
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    const errors = [];
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      errors.push('A valid email address is required.');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      errors.push('Password must be at least 6 characters long.');
    }
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password and create user
    const { hash, salt } = await hashPassword(password);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      salt,
    });

    // Generate JWT
    const token = generateToken(user._id.toString());

    res.status(201).json({
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /auth/login
 * Authenticate with email + password. Returns a JWT on success.
 */
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = generateToken(user._id.toString());

    res.json({
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /auth/me
 * Returns the current user's profile. Requires valid JWT.
 */
app.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash -salt');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ id: user._id, email: user.email });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPENSE ROUTES (protected — require valid JWT)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /expenses
 * Returns a list of the authenticated user's expenses.
 * Optional query parameters:
 * - category: string (filter by category)
 * - sort: string (sort order, defaults to 'date_desc'. Supports 'date_desc' or 'date_asc')
 */
app.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const { category, sort } = req.query;
    const sortOrder = sort || 'date_desc';

    // Build query — always scoped to the authenticated user
    const query = { userId: req.userId };
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    // Build sort object
    const sortObj = sortOrder === 'date_asc'
      ? { date: 1, createdAt: 1 }
      : { date: -1, createdAt: -1 };

    const expenses = await Expense.find(query).sort(sortObj).lean();

    // Map _id to id for frontend compatibility
    const mapped = expenses.map(e => ({
      id: e._id.toString(),
      amount: e.amount,
      category: e.category,
      description: e.description,
      date: e.date,
      createdAt: e.createdAt,
      idempotencyKey: e.idempotencyKey,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /expenses/summary
 * Returns a total amount and sum per category for the authenticated user.
 */
app.get('/expenses/summary', authenticateToken, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.userId }).lean();

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
 * Create a new expense for the authenticated user.
 * Validates request body, parses amount to cents, and uses idempotency-key to prevent duplicates.
 */
app.post('/expenses', authenticateToken, async (req, res) => {
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

    // Idempotency check: look for matching key for this user
    if (idempotencyKey) {
      const existing = await Expense.findOne({
        userId: req.userId,
        idempotencyKey,
      }).lean();

      if (existing) {
        console.log(`Idempotency hit! Request with key ${idempotencyKey} already exists. Returning original.`);
        res.setHeader('X-Cache-Lookup', 'HIT - IDEMPOTENCY');
        return res.status(200).json({
          id: existing._id.toString(),
          amount: existing.amount,
          category: existing.category,
          description: existing.description,
          date: existing.date,
          createdAt: existing.createdAt,
          idempotencyKey: existing.idempotencyKey,
        });
      }
    }

    // Save to MongoDB
    const newExpense = await Expense.create({
      userId: req.userId,
      amount: amountInCents,
      category,
      description: description || '',
      date,
      idempotencyKey: idempotencyKey || null,
    });

    res.status(201).json({
      id: newExpense._id.toString(),
      amount: newExpense.amount,
      category: newExpense.category,
      description: newExpense.description,
      date: newExpense.date,
      createdAt: newExpense.createdAt,
      idempotencyKey: newExpense.idempotencyKey,
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /expenses/:id
 * Delete a single expense by its ID. Only the owner can delete their own expenses.
 * Returns 204 No Content on success, 404 if the expense does not exist.
 */
app.delete('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid expense ID.' });
    }

    // Only delete if the expense belongs to the authenticated user
    const result = await Expense.findOneAndDelete({ _id: id, userId: req.userId });

    if (!result) {
      return res.status(404).json({ error: `Expense with id '${id}' not found.` });
    }

    res.status(204).send(); // No Content
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

// Connect to MongoDB, then start listening
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Expense Tracker Backend is running on port ${PORT}`);
  });
});
