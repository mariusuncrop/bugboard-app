import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Spinner } from './Spinner';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, restoring } = useAuth();
  const location = useLocation();

  if (restoring) return <Spinner label="Restoring session" testId="session-loading" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <>{children}</>;
}
