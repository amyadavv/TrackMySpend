import { BASE_URL } from '../constants';

const TOKEN_KEY = 'tms_auth_token';

/**
 * Returns an Authorization header object with the stored JWT token.
 * @returns {Record<string, string>}
 */
function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Handle 401 responses by clearing the token and reloading to show login.
 * @param {Response} response
 */
function handleUnauthorized(response) {
  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.reload();
  }
}

/**
 * Builds simulation headers based on the current network mode.
 * @param {'normal'|'slow'|'unreliable'} networkMode
 * @returns {Record<string, string>}
 */
function buildSimHeaders(networkMode) {
  const headers = {};
  if (networkMode === 'slow') {
    headers['x-simulate-slow'] = '2000';
  } else if (networkMode === 'unreliable') {
    headers['x-simulate-error'] = 'true';
  }
  return headers;
}

/**
 * Fetch all expenses, optionally filtered by category.
 * @param {{ categoryFilter?: string, networkMode?: string }} options
 * @returns {Promise<Array>}
 */
export async function getExpenses({ categoryFilter = '', networkMode = 'normal' } = {}) {
  let url = `${BASE_URL}/expenses?sort=date_desc`;
  if (categoryFilter) {
    url += `&category=${encodeURIComponent(categoryFilter)}`;
  }

  const headers = { ...authHeaders(), ...buildSimHeaders(networkMode) };

  const response = await fetch(url, { headers });

  if (!response.ok) {
    handleUnauthorized(response);
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status} Error`);
  }

  return response.json();
}

/**
 * Post a new expense. Includes idempotency key header.
 * @param {{ payload: object, networkMode?: string }} options
 * @returns {Promise<{ result: object, cacheHit: boolean }>}
 */
export async function postExpense({ payload, networkMode = 'normal' } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Idempotency-Key': payload.idempotencyKey,
    ...authHeaders(),
    ...buildSimHeaders(networkMode),
  };

  const response = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    handleUnauthorized(response);
    const errBody = await response.json().catch(() => ({}));
    const errMsg = errBody.errors
      ? errBody.errors.join(', ')
      : errBody.error || `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const result = await response.json();
  const cacheHeader = response.headers.get('X-Cache-Lookup');
  const cacheHit = !!(cacheHeader && cacheHeader.includes('HIT'));

  return { result, cacheHit };
}

/**
 * Delete an expense by ID.
 * @param {{ id: string, networkMode?: string }} options
 * @returns {Promise<void>}
 */
export async function deleteExpense({ id, networkMode = 'normal' } = {}) {
  const headers = { ...authHeaders(), ...buildSimHeaders(networkMode) };

  const response = await fetch(`${BASE_URL}/expenses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    handleUnauthorized(response);
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP ${response.status}`);
  }
  // 204 No Content — nothing to return
}

/**
 * Parse natural language text into a structured expense using AI.
 * @param {{ text: string, networkMode?: string }} options
 * @returns {Promise<{ amount: number, category: string, description: string, date: string }>}
 */
export async function parseExpenseWithAI({ text, networkMode = 'normal' } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...buildSimHeaders(networkMode),
  };

  const response = await fetch(`${BASE_URL}/expenses/parse`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    handleUnauthorized(response);
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP ${response.status}`);
  }

  return response.json();
}
