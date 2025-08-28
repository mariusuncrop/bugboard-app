import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { applyTheme, readTheme, type Theme } from '../lib/theme';
import { Avatar } from './Avatar';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>(() => readTheme());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app">
      <header className="header" data-testid="app-header">
        <div className="header__inner">
          <NavLink to="/board" className="brand" data-testid="brand">
            <span className="brand__mark" aria-hidden="true">
              BB
            </span>
            BugBoard
          </NavLink>

          <nav className="nav" aria-label="Main">
            <NavLink to="/board" data-testid="nav-board">
              Board
            </NavLink>
            <NavLink to="/issues" data-testid="nav-issues">
              Issues
            </NavLink>
            <NavLink to="/dashboard" data-testid="nav-dashboard">
              Dashboard
            </NavLink>
          </nav>

          <div className="header__actions">
            <button
              type="button"
              className="button button--ghost"
              data-testid="theme-toggle"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>

            <NavLink to="/issues/new" className="button button--primary" data-testid="new-issue-button">
              New issue
            </NavLink>

            <div className="user-menu">
              <button
                type="button"
                className="user-menu__trigger"
                data-testid="user-menu"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <Avatar user={user} />
                <span data-testid="user-menu-name">{user?.name}</span>
              </button>

              {menuOpen ? (
                <div className="user-menu__panel" role="menu" data-testid="user-menu-panel">
                  <p data-testid="user-menu-email">{user?.email}</p>
                  <p className="user-menu__role" data-testid="user-menu-role">
                    {user?.role}
                  </p>
                  <button type="button" role="menuitem" data-testid="logout-button" onClick={handleLogout}>
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="main" data-testid="main">
        <Outlet />
      </main>
    </div>
  );
}
