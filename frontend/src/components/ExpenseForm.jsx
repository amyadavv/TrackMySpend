import { useState } from 'react';
import { CATEGORIES } from '../constants';
import { postExpense } from '../api/expenseApi';

/**
 * ExpenseForm — controlled form for recording a new expense.
 * Handles client-side validation, retry logic, and idempotency.
 */
function ExpenseForm({ networkMode, addLog, onExpenseAdded }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    // Client-side validations
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSubmitError('Please enter a valid amount greater than 0.');
      setSubmitting(false);
      return;
    }

    if (!date) {
      setSubmitError('Please select a valid date.');
      setSubmitting(false);
      return;
    }

    // Prepare payload with idempotency key
    const idempotencyKey = crypto.randomUUID();
    const payload = {
      amount: numAmount,
      category,
      description: description.trim(),
      date,
      idempotencyKey,
    };

    // Retry settings
    const MAX_RETRIES = 3;
    let attempt = 0;
    let success = false;

    addLog('outbound', `Initiating POST /expenses. Amount: ₹${numAmount}. Key: ...${idempotencyKey.slice(-8)}`);

    while (attempt < MAX_RETRIES && !success) {
      attempt++;

      try {
        if (attempt > 1) {
          addLog('retry', `POST retry attempt ${attempt}/${MAX_RETRIES} for Key ...${idempotencyKey.slice(-8)}`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        const { result, cacheHit } = await postExpense({ payload, networkMode });

        if (cacheHit) {
          addLog('success', `POST success (Idempotent Hit! Deduplicated on Server). ID: ...${result.id.slice(-8)}`);
        } else {
          addLog('success', `POST success (New Created). ID: ...${result.id.slice(-8)}`);
        }

        success = true;
      } catch (err) {
        console.warn(`Attempt ${attempt} failed:`, err.message);
        addLog('fail', `POST attempt ${attempt} failed: ${err.message}`);

        if (attempt === MAX_RETRIES) {
          setSubmitError(`Network transmission failed after ${MAX_RETRIES} attempts. ${err.message}`);
        }
      }
    }

    if (success) {
      setSubmitSuccess(true);
      setAmount('');
      setDescription('');
      onExpenseAdded(); // silently refresh parent list
      setTimeout(() => setSubmitSuccess(false), 3000);
    }

    setSubmitting(false);
  };

  return (
    <div className="glass-card">
      <h2 className="card-title">Add Expense</h2>

      {submitError && (
        <div className="alert alert-danger" role="alert">
          <span>{submitError}</span>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {submitSuccess && (
        <div className="alert alert-success" role="status">
          <span>Expense added successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="amount">Amount *</label>
          <div className="input-wrapper">
            <span className="currency-prefix">₹</span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              className="form-control has-prefix"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            className="form-control"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={submitting}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="date">Date *</label>
          <input
            id="date"
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            type="text"
            className="form-control"
            placeholder="e.g. Starbucks, Gas station"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            maxLength={255}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
          {submitting ? (
            <>
              <svg
                className="animate-spin"
                style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </>
          ) : (
            'Record Expense'
          )}
        </button>
      </form>
    </div>
  );
}

export default ExpenseForm;
