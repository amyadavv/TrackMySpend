import { useState, useEffect, useRef } from 'react';
import './App.css';

import { CATEGORIES } from './constants';
import { getExpenses, deleteExpense } from './api/expenseApi';

import Header from './components/Header';
import ExpenseForm from './components/ExpenseForm';
import NetworkConsole from './components/NetworkConsole';
import SummaryCards from './components/SummaryCards';
import CategoryBreakdown from './components/CategoryBreakdown';
import ExpenseLedger from './components/ExpenseLedger';

function App() {
  // Expense list state
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState('');

  // Resilience & simulation states
  const [networkMode, setNetworkMode] = useState('normal'); // 'normal' | 'slow' | 'unreliable'
  const [networkLogs, setNetworkLogs] = useState([]);
  const [theme, setTheme] = useState('dark');

  // Auto-incrementing log ID
  const logIdRef = useRef(0);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const addLog = (type, message) => {
    logIdRef.current += 1;
    const time = new Date().toLocaleTimeString();
    setNetworkLogs((prev) => [
      { id: logIdRef.current, time, type, message },
      ...prev.slice(0, 49), // Keep last 50 entries
    ]);
  };

  const formatMoney = (cents) => {
    if (cents === undefined || cents === null || isNaN(cents)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(cents / 100);
  };

  // ── Delete expense ───────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    addLog('outbound', `DELETE /expenses/${id.slice(-8)}...`);
    try {
      await deleteExpense({ id, networkMode });
      addLog('success', `DELETE /expenses/...${id.slice(-8)} succeeded`);
      await fetchExpenses(true); // silently refresh
    } catch (err) {
      console.error(err);
      addLog('fail', `DELETE /expenses/...${id.slice(-8)} failed: ${err.message}`);
    }
  };

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchExpenses = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    addLog('outbound', `GET /expenses${categoryFilter ? `?category=${categoryFilter}` : ''}`);

    try {
      const data = await getExpenses({ categoryFilter, networkMode });
      setExpenses(data);
      addLog('success', `GET /expenses returned ${data.length} records`);
      setError(null);
    } catch (err) {
      console.error(err);
      addLog('fail', `GET /expenses failed: ${err.message}`);
      if (!silent) {
        setError(`Failed to load expenses. ${err.message}`);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Fetch whenever filter or network mode changes
  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, networkMode]);

  // ── Derived data (calculations for current view) ───────────────────────────

  const currentTotalCents = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const categorySummary = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

  // Pre-fill missing categories with ₹0
  CATEGORIES.forEach((c) => {
    if (!categorySummary[c]) categorySummary[c] = 0;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Header
        networkMode={networkMode}
        setNetworkMode={setNetworkMode}
        theme={theme}
        toggleTheme={toggleTheme}
        addLog={addLog}
      />

      <main className="dashboard-grid">

        {/* Left Side: Create Form & Resilience Panel */}
        <section className="dashboard-left" aria-label="Input controls">
          <ExpenseForm
            networkMode={networkMode}
            addLog={addLog}
            onExpenseAdded={() => fetchExpenses(true)}
          />

          <NetworkConsole
            networkMode={networkMode}
            networkLogs={networkLogs}
            clearLogs={() => setNetworkLogs([])}
          />
        </section>

        {/* Right Side: Summary, Breakdown & Ledger */}
        <section className="dashboard-right" aria-label="Dashboard insights">
          <SummaryCards
            totalCents={currentTotalCents}
            count={expenses.length}
            formatMoney={formatMoney}
          />

          <CategoryBreakdown
            categorySummary={categorySummary}
            totalCents={currentTotalCents}
            formatMoney={formatMoney}
          />

          <ExpenseLedger
            expenses={expenses}
            loading={loading}
            error={error}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            onRefresh={() => fetchExpenses()}
            onDelete={handleDelete}
            formatMoney={formatMoney}
          />
        </section>

      </main>

      {/* Keyframe animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default App;
