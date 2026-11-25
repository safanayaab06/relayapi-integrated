import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ApiClientPage } from './pages/ApiClientPage';
import { CollectionRunnerPage } from './pages/CollectionRunnerPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { DashboardPage } from './pages/DashboardPage';
import { EnvironmentsPage } from './pages/EnvironmentsPage';
import { ErrorExplainerPage } from './pages/ErrorExplainerPage';
import { HistoryPage } from './pages/HistoryPage';
import { SecurityGuardPage } from './pages/SecurityGuardPage';
import { SettingsPage } from './pages/SettingsPage';
import { ValidatorPage } from './pages/ValidatorPage';

export default function App() {
  return (
    <WorkspaceProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/client" element={<ApiClientPage />} />
            <Route path="/validator" element={<ValidatorPage />} />
            <Route path="/error-explainer" element={<ErrorExplainerPage />} />
            <Route path="/security-guard" element={<SecurityGuardPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/runner" element={<CollectionRunnerPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/environments" element={<EnvironmentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </WorkspaceProvider>
  );
}
