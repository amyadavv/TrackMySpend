import { useState } from 'react';
import { CATEGORIES } from '../constants';

/**
 * ExpenseLedger — filter controls, loading/error states, and the expense list table.
 * Each row has a delete button that shows an inline confirmation before removing.
 */
function ExpenseLedger({ expenses, loading, error, categoryFilter, setCategoryFilter, onRefresh, onDelete, formatMoney }) {
  // Track which expense ID is pending delete confirmation
  const [confirmingId, setConfirmingId] = useState(null);
  // Track which expense ID is currently being deleted (shows spinner)
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteClick = (id) => {
    setConfirmingId(id);
  };

  const handleConfirmDelete = async (id) => {
    setDeletingId(id);
    setConfirmingId(null);
    await onDelete(id);
    setDeletingId(null);
  };

  const handleCancelDelete = () => {
    setConfirmingId(null);
  };

  return (
    <div className="glass-card">
      {/* Filter Controls */}
      <div className="list-controls">
        <h2 className="card-title" style={{ margin: 0 }}>Expense Ledger</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            id="category-filter"
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRefresh}
            title="Reload ledger"
            aria-label="Reload ledger"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expense List */}
      {loading ? (
        <div className="expense-list">
          <div className="skeleton-item skeleton-pulse" />
          <div className="skeleton-item skeleton-pulse" />
          <div className="skeleton-item skeleton-pulse" />
        </div>
      ) : error ? (
        <div className="alert alert-danger" style={{ padding: '24px', textAlign: 'center', flexDirection: 'column' }}>
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={onRefresh}>
            Try Re-connecting
          </button>
        </div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <p>No expenses found. Record your first expense on the left panel!</p>
        </div>
      ) : (
        <div className="expense-list">
          {expenses.map((exp) => {
            const isConfirming = confirmingId === exp.id;
            const isDeleting = deletingId === exp.id;

            return (
              <div key={exp.id} className={`expense-item ${isDeleting ? 'expense-item--deleting' : ''}`}>
                <div>
                  <span className={`badge badge-${exp.category.toLowerCase()}`}>{exp.category}</span>
                </div>

                <div className="expense-details">
                  <span className="expense-desc">{exp.description || 'No description'}</span>
                  <span className="expense-meta">
                    {new Date(exp.date + 'T00:00:00').toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="expense-value-col">
                  <span className="expense-amount">{formatMoney(exp.amount)}</span>
                  <span className="expense-time">
                    {new Date(exp.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                {/* Delete controls */}
                <div className="expense-delete-col">
                  {isDeleting ? (
                    // Spinner while deleting
                    <svg
                      style={{ animation: 'spin 1s linear infinite', color: 'var(--danger-color)' }}
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : isConfirming ? (
                    // Inline confirm / cancel
                    <div className="delete-confirm">
                      <span className="delete-confirm-label">Remove?</span>
                      <button
                        type="button"
                        className="btn-icon btn-icon--danger"
                        title="Confirm delete"
                        aria-label="Confirm delete"
                        onClick={() => handleConfirmDelete(exp.id)}
                      >
                        {/* Checkmark */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-icon--muted"
                        title="Cancel"
                        aria-label="Cancel delete"
                        onClick={handleCancelDelete}
                      >
                        {/* X */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    // Default trash icon button
                    <button
                      type="button"
                      className="btn-icon btn-icon--ghost"
                      title="Delete expense"
                      aria-label="Delete expense"
                      onClick={() => handleDeleteClick(exp.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ExpenseLedger;
