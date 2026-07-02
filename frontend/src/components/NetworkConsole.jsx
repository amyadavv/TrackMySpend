/**
 * NetworkConsole — real-time HTTP transaction log terminal.
 */
function NetworkConsole({ networkMode, networkLogs, clearLogs }) {
  return (
    <div className="glass-card resilience-panel">
      <h2 className="card-title resilience-header">
        <span>Network Console</span>
        <span className={`network-badge ${networkMode === 'unreliable' ? 'unreliable' : 'online'}`}>
          {networkMode === 'unreliable' ? 'Unreliable Mode' : 'Online'}
        </span>
      </h2>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '-10px 0 12px' }}>
        Real-time HTTP logs demonstrating retries and server deduplication (idempotency key matches).
      </p>

      <div className="network-log-container">
        {networkLogs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '30px' }}>
            No network transactions logged yet.
          </div>
        ) : (
          networkLogs.map((log) => (
            <div key={log.id} className={`network-log-entry ${log.type}`}>
              [{log.time}] <span style={{ fontWeight: 'bold' }}>{log.type.toUpperCase()}:</span> {log.message}
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-full"
        style={{ marginTop: '12px', padding: '6px' }}
        onClick={clearLogs}
      >
        Clear Logs
      </button>
    </div>
  );
}

export default NetworkConsole;
