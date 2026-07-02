/**
 * SummaryCards — banner showing total spent and transaction count for current view.
 */
function SummaryCards({ totalCents, count, formatMoney }) {
  return (
    <div className="summary-widget-container">
      <div className="glass-card summary-card">
        <span className="label">Total Spent (Filtered)</span>
        <div className="value" id="current-total">{formatMoney(totalCents)}</div>
      </div>
      <div className="glass-card summary-card">
        <span className="label">Transactions Count</span>
        <div className="value" id="current-count">{count}</div>
      </div>
    </div>
  );
}

export default SummaryCards;
