import {
  BankOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Card, Col, List, Row, Statistic, Table, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmtDate, fmtMoney, fmtQty } from "../api";
import type { Nfe, Payable, StockBalance } from "../types";

export default function Dashboard() {
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [pendingNfes, setPendingNfes] = useState<Nfe[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [summary, setSummary] = useState<any>({});

  useEffect(() => {
    api.get("/stock/balances").then((r) => setBalances(r.data));
    api.get("/nfe", { params: { status: "PENDENTE" } }).then((r) => setPendingNfes(r.data));
    api.get("/finance/payables").then((r) => setPayables(r.data));
    api.get("/finance/payables/summary").then((r) => setSummary(r.data));
  }, []);

  const valorEstoque = balances.reduce((sum, b) => sum + (b.valor_estoque ?? 0), 0);
  const abaixoMinimo = balances.filter((b) => b.estoque_minimo > 0 && b.saldo < b.estoque_minimo);
  const proximosPagamentos = payables
    .filter((p) => ["ABERTO", "PROGRAMADO"].includes(p.status))
    .slice(0, 8);

  return (
    <Row gutter={[16, 16]}>
      <Col span={6}>
        <Card>
          <Statistic
            title="Valor do estoque"
            value={valorEstoque}
            precision={2}
            prefix="R$"
            suffix={<DatabaseOutlined style={{ fontSize: 16, color: "#999" }} />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="NF-e pendentes de aceite"
            value={pendingNfes.length}
            suffix={<FileTextOutlined style={{ fontSize: 16, color: "#999" }} />}
            valueStyle={{ color: pendingNfes.length ? "#d48806" : undefined }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Contas em aberto"
            value={summary.total_aberto ?? 0}
            precision={2}
            prefix="R$"
            suffix={<BankOutlined style={{ fontSize: 16, color: "#999" }} />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Vencidas"
            value={summary.vencidas ?? 0}
            precision={2}
            prefix="R$"
            valueStyle={{ color: (summary.vencidas ?? 0) > 0 ? "#cf1322" : undefined }}
            suffix={<WarningOutlined style={{ fontSize: 16, color: "#999" }} />}
          />
        </Card>
      </Col>

      <Col span={12}>
        <Card
          title="Próximos pagamentos"
          extra={<Link to="/financeiro">ver todos</Link>}
          styles={{ body: { padding: 0 } }}
        >
          <Table<Payable>
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={proximosPagamentos}
            columns={[
              { title: "Vencimento", dataIndex: "vencimento", width: 110, render: fmtDate },
              { title: "Descrição", dataIndex: "descricao", ellipsis: true },
              { title: "Parcela", dataIndex: "parcela", width: 75, render: (v) => v ?? "-" },
              {
                title: "Valor",
                dataIndex: "valor",
                width: 115,
                align: "right",
                render: (v) => fmtMoney(Number(v)),
              },
              {
                title: "",
                width: 105,
                render: (_, r) =>
                  r.status === "PROGRAMADO" ? <Tag color="blue">Programada</Tag> : <Tag color="gold">Aberta</Tag>,
              },
            ]}
          />
        </Card>
      </Col>

      <Col span={12}>
        <Card
          title={
            <span>
              Produtos abaixo do estoque mínimo{" "}
              {abaixoMinimo.length > 0 && <Tag color="red">{abaixoMinimo.length}</Tag>}
            </span>
          }
          extra={<Link to="/estoque">ver estoque</Link>}
          styles={{ body: { padding: abaixoMinimo.length ? 0 : undefined } }}
        >
          {abaixoMinimo.length === 0 ? (
            <Typography.Text type="secondary">
              Nenhum produto abaixo do mínimo.
            </Typography.Text>
          ) : (
            <Table<StockBalance>
              rowKey="product_id"
              size="small"
              pagination={false}
              dataSource={abaixoMinimo.slice(0, 8)}
              columns={[
                { title: "Produto", dataIndex: "descricao", ellipsis: true },
                {
                  title: "Saldo",
                  width: 130,
                  align: "right",
                  render: (_, r) => (
                    <span style={{ color: "#cf1322" }}>
                      {fmtQty(r.saldo)} / mín. {fmtQty(r.estoque_minimo)} {r.unidade}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </Col>

      {pendingNfes.length > 0 && (
        <Col span={24}>
          <Card title="NF-e aguardando aceite" extra={<Link to="/nfe">importar / dar aceite</Link>}>
            <List
              dataSource={pendingNfes}
              renderItem={(nfe) => (
                <List.Item>
                  <List.Item.Meta
                    title={`NF ${nfe.numero} — ${nfe.emit_nome}`}
                    description={`${nfe.items.length} item(ns) · ${nfe.duplicatas.length} parcela(s)`}
                  />
                  <Typography.Text strong>{fmtMoney(Number(nfe.valor_total))}</Typography.Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      )}
    </Row>
  );
}
