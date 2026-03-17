import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConnectionListPage } from '../pages/ConnectionListPage';
import { ConnectionCreatePage } from '../pages/ConnectionCreatePage';
import { ConnectionEditPage } from '../pages/ConnectionEditPage';
import { TerminalPage } from '../pages/TerminalPage';
import { PageLayout } from '../layouts/PageLayout';
import { useUserId } from '../hooks/useUserId';

export function AppRoutes() {
  const userId = useUserId();

  return (
    <BrowserRouter>
      <PageLayout>
        {!userId ? (
          <div className="flex items-center justify-center h-full bg-gray-900 text-white">
            <div>加载中...</div>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<ConnectionListPage />} />
            <Route path="/create" element={<ConnectionCreatePage />} />
            <Route path="/connections/:id/edit" element={<ConnectionEditPage />} />
            <Route path="/connections/:id/terminal" element={<TerminalPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </PageLayout>
    </BrowserRouter>
  );
}
