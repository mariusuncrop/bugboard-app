import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

const DEMO_ACCOUNTS = [
  { email: 'admin@bugboard.dev', role: 'admin — can delete issues' },
  { email: 'dev@bugboard.dev', role: 'member' },
  { email: 'qa@bugboard.dev', role: 'member' },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/board" replace />;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/board', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError('Could not reach the server. Is the API running?');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login" data-testid="login-page">
      <div className="card login__card">
        <h1>Sign in to BugBoard</h1>
        <p className="muted">Track bugs and tasks across a kanban board.</p>

        <form className="form" data-testid="login-form" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <p className="alert alert--error" role="alert" data-testid="login-error">
              {formError}
            </p>
          ) : null}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              data-testid="login-email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {errors.email ? (
              <p className="field__error" id="email-error" data-testid="error-email">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              data-testid="login-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {errors.password ? (
              <p className="field__error" id="password-error" data-testid="error-password">
                {errors.password}
              </p>
            ) : null}
          </div>

          <button type="submit" className="button button--primary" data-testid="login-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login__hint" data-testid="demo-accounts">
          <p className="muted">Demo accounts — password <code>Password123!</code></p>
          <ul>
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="link"
                  data-testid={`demo-account-${account.email}`}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('Password123!');
                  }}
                >
                  {account.email}
                </button>
                <span className="muted"> · {account.role}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
