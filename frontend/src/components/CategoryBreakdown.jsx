import { CATEGORIES } from '../constants';

/**
 * CategoryBreakdown — per-category spend bars based on the current filtered view.
 */
function CategoryBreakdown({ categorySummary, totalCents, formatMoney }) {
  return (
    <div className="glass-card" style={{ marginBottom: '24px' }}>
      <h2 className="card-title">Category Breakdown</h2>
      <div className="category-breakdown">
        {CATEGORIES.map((cat) => {
          const amountCents = categorySummary[cat] || 0;
          const percentage = totalCents > 0 ? (amountCents / totalCents) * 100 : 0;
          return (
            <div key={cat} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="breakdown-row">
                <span className={`badge badge-${cat.toLowerCase()}`}>{cat}</span>
                <span style={{ fontWeight: '600' }}>
                  {formatMoney(amountCents)} ({percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="breakdown-bar-bg">
                <div className="breakdown-bar-fill" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryBreakdown;
