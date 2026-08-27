import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Loading } from '@/components/ui';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { NfeList } from '@/pages/NfeList';
import { NfeDetail } from '@/pages/NfeDetail';
import { Emitir } from '@/pages/Emitir';
import { Emitentes } from '@/pages/Emitentes';
import { Destinatarios } from '@/pages/Destinatarios';
import { Produtos } from '@/pages/Produtos';
import { Inutilizacoes } from '@/pages/Inutilizacoes';
import { Lotes } from '@/pages/Lotes';
import { Auditoria } from '@/pages/Auditoria';
import { Configuracoes } from '@/pages/Configuracoes';
import { api } from '@/lib/api';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<boolean | null>(null);
  useEffect(() => {
    api.me().then((r) => setAuth(r.authenticated)).catch(() => setAuth(false));
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
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="nfe" element={<NfeList />} />
          <Route path="nfe/:chave" element={<NfeDetail />} />
          <Route path="emitir" element={<Emitir />} />
          <Route path="emitentes" element={<Emitentes />} />
          <Route path="destinatarios" element={<Destinatarios />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="inutilizacoes" element={<Inutilizacoes />} />
          <Route path="lotes" element={<Lotes />} />
          <Route path="auditoria" element={<Auditoria />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
