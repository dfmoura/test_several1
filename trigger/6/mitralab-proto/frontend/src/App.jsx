import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout.jsx';
import ConnectionsPage from './pages/ConnectionsPage.jsx';
import QueryExplorerPage from './pages/QueryExplorerPage.jsx';
import DashboardsPage from './pages/DashboardsPage.jsx';
import AiPromptPage from './pages/AiPromptPage.jsx';
import DataSourcesPage from './pages/DataSourcesPage.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/connections" replace />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/query" element={<QueryExplorerPage />} />
        <Route path="/data-sources" element={<DataSourcesPage />} />
        <Route path="/dashboards" element={<DashboardsPage />} />
        <Route path="/ai" element={<AiPromptPage />} />
      </Routes>
    </Layout>
  );
}
