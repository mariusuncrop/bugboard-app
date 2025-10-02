import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { AuthProvider } from './lib/auth';
import { ProjectsProvider } from './lib/projects';
import { applyTheme, readTheme } from './lib/theme';
import { ToastProvider } from './lib/toast';
import { BoardPage } from './pages/BoardPage';
import { DashboardPage } from './pages/DashboardPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { IssuesPage } from './pages/IssuesPage';
import { LoginPage } from './pages/LoginPage';
import { NewIssuePage } from './pages/NewIssuePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { ProjectSettingsPage } from './pages/ProjectSettingsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import './styles/app.css';

applyTheme(readTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ProjectsProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route index element={<Navigate to="/projects" replace />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/new" element={<NewProjectPage />} />
                <Route path="/projects/:projectKey/board" element={<BoardPage />} />
                <Route path="/projects/:projectKey/issues" element={<IssuesPage />} />
                <Route path="/projects/:projectKey/issues/new" element={<NewIssuePage />} />
                <Route path="/projects/:projectKey/issues/:issueKey" element={<IssueDetailPage />} />
                <Route path="/projects/:projectKey/dashboard" element={<DashboardPage />} />
                <Route path="/projects/:projectKey/settings" element={<ProjectSettingsPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ProjectsProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
