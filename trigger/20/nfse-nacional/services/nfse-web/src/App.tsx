import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Loading } from '@/components/Loading';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { NfseList } from '@/pages/NfseList';
import { NfseDetail } from '@/pages/NfseDetail';
import { Emitir } from '@/pages/Emitir';
import { DpsList } from '@/pages/DpsList';
import { Sync } from '@/pages/Sync';
import { Outbox } from '@/pages/Outbox';
import { Auditoria } from '@/pages/Auditoria';
import { Configuracoes } from '@/pages/Configuracoes';
import { api } from '@/lib/api';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<boolean | null>(null);

  useEffect(() => {
    api.me()
      .then((r) => setAuth(r.authenticated))
      .catch(() => setAuth(false));
  }, []);

  if (auth === null) return <Loading />;
  if (!auth) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="nfse" element={<NfseList />} />
          <Route path="nfse/:chave" element={<NfseDetail />} />
          <Route path="emitir" element={<Emitir />} />
          <Route path="dps" element={<DpsList />} />
          <Route path="sync" element={<Sync />} />
          <Route path="outbox" element={<Outbox />} />
          <Route path="auditoria" element={<Auditoria />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="sistema" element={<Navigate to="/configuracoes" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
