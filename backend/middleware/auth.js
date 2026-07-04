import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// ── Password Hashing (Node built-in crypto.scrypt) ─────────────────────────

/**
 * Hash a password with a random salt using scrypt.
 * @param {string} password - Plain-text password
 * @returns {Promise<{ hash: string, salt: string }>}
 */
export function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({ hash: derivedKey.toString('hex'), salt });
    });
  });
}

/**
 * Verify a password against a stored hash + salt.
 * @param {string} password - Plain-text password to verify
 * @param {string} storedHash - Previously stored hex hash
 * @param {string} salt - Salt used during hashing
 * @returns {Promise<boolean>}
 */
export function verifyPassword(password, storedHash, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), derivedKey));
    });
  });
}

// ── JWT Helpers ─────────────────────────────────────────────────────────────

const JWT_EXPIRY = '7d'; // Token valid for 7 days

/**
 * Generate a signed JWT for a given user ID.
 * @param {string} userId - MongoDB ObjectId as string
 * @returns {string} Signed JWT
 */
export function generateToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
  }
  return jwt.sign({ userId }, secret, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify and decode a JWT.
 * @param {string} token
 * @returns {{ userId: string }} Decoded payload
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
  }
  return jwt.verify(token, secret);
}

// ── Express Middleware ──────────────────────────────────────────────────────

/**
 * Express middleware that validates the Authorization header.
 * On success, sets `req.userId` from the JWT payload.
 * On failure, returns 401 Unauthorized.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please provide a valid token.' });
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
}
