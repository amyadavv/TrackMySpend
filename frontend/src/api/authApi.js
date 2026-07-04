import { BASE_URL } from '../constants';

/**
 * Register a new user account.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ token: string, user: { id: string, email: string } }>}
 */
export async function registerUser({ email, password }) {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const errMsg = errBody.errors
      ? errBody.errors.join(', ')
      : errBody.error || `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  return response.json();
}

/**
 * Log in with email + password.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ token: string, user: { id: string, email: string } }>}
 */
export async function loginUser({ email, password }) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const errMsg = errBody.errors
      ? errBody.errors.join(', ')
      : errBody.error || `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  return response.json();
}

/**
 * Fetch the current user's profile using a stored token.
 * @param {string} token - JWT token
 * @returns {Promise<{ id: string, email: string }>}
 */
export async function getMe(token) {
  const response = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Token invalid or expired');
  }

  return response.json();
}
