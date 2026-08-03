import {
  BankOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Typography } from "antd";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Finance from "./pages/Finance";
import NfePage from "./pages/NfePage";
import Orders from "./pages/Orders";
import Products from "./pages/Products";
import Requisitions from "./pages/Requisitions";
import Stock from "./pages/Stock";
import Suppliers from "./pages/Suppliers";

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "/nfe", icon: <FileTextOutlined />, label: "Importar NF-e (XML)" },
  { key: "/estoque", icon: <DatabaseOutlined />, label: "Estoque" },
  { key: "/requisicoes", icon: <SolutionOutlined />, label: "Requisições" },
  { key: "/pedidos", icon: <ShoppingCartOutlined />, label: "Pedidos de Compra" },
  { key: "/financeiro", icon: <BankOutlined />, label: "Financeiro" },
  { key: "/produtos", icon: <TagsOutlined />, label: "Produtos" },
  { key: "/fornecedores", icon: <ShopOutlined />, label: "Fornecedores" },
];

const titles: Record<string, string> = {
  "/": "Visão geral",
  "/nfe": "Importação de NF-e por XML",
  "/estoque": "Controle de estoque",
  "/requisicoes": "Requisições de compra",
  "/pedidos": "Pedidos de compra",
  "/financeiro": "Contas a pagar",
  "/produtos": "Cadastro de produtos",
  "/fornecedores": "Cadastro de fornecedores",
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth={64} theme="dark" width={230}>
        <div
          style={{
            color: "#fff",
            fontWeight: 700,
            fontSize: 18,
            padding: "18px 16px",
            letterSpacing: 0.5,
          }}
        >
          RLP&nbsp;ERP
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: "#fff", paddingInline: 24, borderBottom: "1px solid #f0f0f0" }}>
          <Typography.Title level={4} style={{ margin: 0, lineHeight: "64px" }}>
            {titles[location.pathname] ?? ""}
          </Typography.Title>
        </Header>
        <Content style={{ margin: 24 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/nfe" element={<NfePage />} />
            <Route path="/estoque" element={<Stock />} />
            <Route path="/requisicoes" element={<Requisitions />} />
            <Route path="/pedidos" element={<Orders />} />
            <Route path="/financeiro" element={<Finance />} />
            <Route path="/produtos" element={<Products />} />
            <Route path="/fornecedores" element={<Suppliers />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
