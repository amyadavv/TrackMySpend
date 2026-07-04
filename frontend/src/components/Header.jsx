import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

/**
 * Header — top banner with logo, user info, network simulation selector, and theme toggle.
 */
function Header({ networkMode, setNetworkMode, theme, toggleTheme, addLog }) {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="app-header">
      <div className="logo-section">
        <h1>TrackMySpend AI</h1>
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

        {/* User info & logout */}
        {user && (
          <div className="user-menu-container" ref={menuRef}>
            <button
              className="avatar-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-label="User menu"
            >
              {user.email.charAt(0).toUpperCase()}
            </button>

            {isMenuOpen && (
              <div className="avatar-dropdown">
                <div className="dropdown-header">
                  <p className="dropdown-email" title={user.email}>{user.email}</p>
                </div>
                <div className="dropdown-divider"></div>
                <button
                  type="button"
                  className="dropdown-item text-danger"
                  onClick={logout}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log out
                </button>
              </div>
            )}
          </div>
        )}

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
