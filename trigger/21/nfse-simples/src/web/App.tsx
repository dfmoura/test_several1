import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Emitir from './pages/Emitir';
import Emitidas from './pages/Emitidas';
import Recebidas from './pages/Recebidas';

function Layout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-brand">NFS-e Simples</span>
          <div className="nav-links">
            <NavLink to="/" end>Início</NavLink>
            <NavLink to="/emitir">Emitir</NavLink>
            <NavLink to="/emitidas">Emitidas</NavLink>
            <NavLink to="/recebidas">Recebidas</NavLink>
          </div>
          <button type="button" className="nav-logout" onClick={onLogout}>Sair</button>
        </div>
      </nav>
      <main className="container">{children}</main>
    </>
  );
}

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.me().then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  async function handleLogout() {
    await api.logout();
    setAuthed(false);
    navigate('/login');
  }

  if (authed === null) {
    return <div className="container"><p className="muted">Carregando...</p></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={
        authed ? <Navigate to="/" /> : <Login onLogin={() => setAuthed(true)} />
      } />
      <Route path="/*" element={
        !authed ? <Navigate to="/login" /> : (
          <Layout onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<Inicio />} />
              <Route path="/emitir" element={<Emitir />} />
              <Route path="/emitidas" element={<Emitidas />} />
              <Route path="/recebidas" element={<Recebidas />} />
            </Routes>
          </Layout>
        )
      } />
    </Routes>
  );
}
