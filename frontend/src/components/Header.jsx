/**
 * Header — top banner with logo, network simulation selector, and theme toggle.
 */
function Header({ networkMode, setNetworkMode, theme, toggleTheme, addLog }) {
  return (
    <header className="app-header">
      <div className="logo-section">
        <h1>TrackMySpend</h1>
        <p>Production-Grade Personal Finance Tracker</p>
      </div>

      <div className="control-bar">
        {/* Simulated Network Settings */}
        <div className="simulation-widget">
          <span
            className={`pulse-indicator ${
              networkMode === 'slow' ? 'slow' : networkMode === 'unreliable' ? 'error' : ''
            }`}
          />
          <label htmlFor="network-sim">Network Simulation:</label>
          <select
            id="network-sim"
            value={networkMode}
            onChange={(e) => {
              setNetworkMode(e.target.value);
              addLog('success', `Network mode switched to: ${e.target.value.toUpperCase()}`);
            }}
          >
            <option value="normal">Normal (Fast)</option>
            <option value="slow">Simulate Latency (2s)</option>
            <option value="unreliable">Simulate Packet Drops (40% fail)</option>
          </select>
        </div>

        {/* Theme toggler */}
        <button
          type="button"
          className="toggle-theme-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}

export default Header;
