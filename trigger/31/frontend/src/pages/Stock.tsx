import { PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage, fmtDateTime, fmtMoney, fmtQty } from "../api";
import type { Product, StockBalance, StockMovement } from "../types";

const tipoTag = (tipo: string) => {
  const map: Record<string, { color: string; label: string }> = {
    ENTRADA_NFE: { color: "green", label: "Entrada NF-e" },
    ENTRADA_MANUAL: { color: "cyan", label: "Entrada manual" },
    SAIDA_MANUAL: { color: "volcano", label: "Saída manual" },
    AJUSTE: { color: "purple", label: "Ajuste" },
  };
  const cfg = map[tipo] ?? { color: "default", label: tipo };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

export default function Stock() {
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [msg, contextHolder] = message.useMessage();

  const load = async () => {
    setLoading(true);
    try {
      const [b, m, p] = await Promise.all([
        api.get("/stock/balances"),
        api.get("/stock/movements"),
        api.get("/products"),
      ]);
      setBalances(b.data);
      setMovements(m.data);
      setProducts(p.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grupos = useMemo(
    () => [...new Set(balances.map((b) => b.grupo).filter(Boolean))] as string[],
    [balances]
  );

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await api.post("/stock/movements", values);
      msg.success("Movimentação registrada.");
      setModalOpen(false);
      form.resetFields();
      await load();
    } catch (err) {
      msg.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {contextHolder}
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
        Nova movimentação manual
      </Button>

      <Tabs
        items={[
          {
            key: "saldos",
            label: "Saldos",
            children: (
              <Table<StockBalance>
                rowKey="product_id"
                loading={loading}
                dataSource={balances}
                pagination={{ pageSize: 20 }}
                columns={[
                  {
                    title: "Grupo",
                    dataIndex: "grupo",
                    width: 110,
                    filters: grupos.map((g) => ({ text: g, value: g })),
                    onFilter: (v, r) => r.grupo === v,
                    render: (v) => v ?? "-",
                  },
                  { title: "Descrição", dataIndex: "descricao" },
                  {
                    title: "Largura",
                    dataIndex: "largura_mm",
                    width: 90,
                    render: (v) => (v ? `${fmtQty(v, 0)} mm` : "-"),
                  },
                  { title: "Gramatura", dataIndex: "gramatura", width: 95, render: (v) => v ?? "-" },
                  { title: "Local", dataIndex: "localizacao", width: 80, render: (v) => v ?? "-" },
                  {
                    title: "Saldo",
                    width: 130,
                    align: "right",
                    sorter: (a, b) => a.saldo - b.saldo,
                    render: (_, r) => (
                      <span style={{ color: r.saldo < r.estoque_minimo ? "#cf1322" : undefined }}>
                        {fmtQty(r.saldo)} {r.unidade}
                      </span>
                    ),
                  },
                  {
                    title: "Saldo m²",
                    dataIndex: "saldo_m2",
                    width: 110,
                    align: "right",
                    render: (v) => (v ? `${fmtQty(v)} m²` : "-"),
                  },
                  {
                    title: "Saldo m/linear",
                    dataIndex: "saldo_ml",
                    width: 120,
                    align: "right",
                    render: (v) => (v ? `${fmtQty(v)} m` : "-"),
                  },
                  {
                    title: "Custo médio",
                    dataIndex: "custo_medio",
                    width: 110,
                    align: "right",
                    render: (v) => (v ? fmtMoney(v) : "-"),
                  },
                  {
                    title: "Valor em estoque",
                    dataIndex: "valor_estoque",
                    width: 140,
                    align: "right",
                    sorter: (a, b) => (a.valor_estoque ?? 0) - (b.valor_estoque ?? 0),
                    render: (v) => (v ? fmtMoney(v) : "-"),
                  },
                ]}
              />
            ),
          },
          {
            key: "movs",
            label: "Movimentações",
            children: (
              <Table<StockMovement>
                rowKey="id"
                loading={loading}
                dataSource={movements}
                pagination={{ pageSize: 20 }}
                columns={[
                  { title: "Data", dataIndex: "created_at", width: 160, render: fmtDateTime },
                  { title: "Tipo", dataIndex: "tipo", width: 140, render: tipoTag },
                  {
                    title: "Produto",
                    render: (_, r) => r.product?.descricao ?? r.product_id,
                  },
                  {
                    title: "Quantidade",
                    width: 140,
                    align: "right",
                    render: (_, r) => `${fmtQty(r.quantidade)} ${r.product?.unidade ?? ""}`,
                  },
                  {
                    title: "m²",
                    dataIndex: "qtd_m2",
                    width: 110,
                    align: "right",
                    render: (v) => (v ? fmtQty(v) : "-"),
                  },
                  {
                    title: "m/linear",
                    dataIndex: "qtd_ml",
                    width: 110,
                    align: "right",
                    render: (v) => (v ? fmtQty(v) : "-"),
                  },
                  {
                    title: "Custo unit.",
                    dataIndex: "custo_unitario",
                    width: 110,
                    align: "right",
                    render: (v) => (v ? fmtMoney(v) : "-"),
                  },
                  { title: "Referência", dataIndex: "referencia", render: (v) => v ?? "-" },
                ]}
              />
            ),
          },
        ]}
      />

      <Modal
        title="Movimentação manual de estoque"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        okText="Registrar"
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" initialValues={{ tipo: "SAIDA_MANUAL" }}>
          <Form.Item name="product_id" label="Produto" rules={[{ required: true, message: "Selecione o produto" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Buscar produto"
              options={products.map((p) => ({
                value: p.id,
                label: `${p.descricao}${p.largura_mm ? ` ${p.largura_mm}mm` : ""} (${p.unidade})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "ENTRADA_MANUAL", label: "Entrada manual" },
                { value: "SAIDA_MANUAL", label: "Saída manual" },
                { value: "AJUSTE", label: "Ajuste (+)" },
              ]}
            />
          </Form.Item>
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item
              name="quantidade"
              label="Quantidade"
              style={{ flex: 1 }}
              rules={[{ required: true, message: "Informe a quantidade" }]}
            >
              <InputNumber min={0.001} style={{ width: "100%" }} decimalSeparator="," />
            </Form.Item>
            <Form.Item name="unidade_informada" label="Unidade" style={{ width: 140 }}>
              <Select
                allowClear
                placeholder="do produto"
                options={[
                  { value: "M2", label: "m²" },
                  { value: "ML", label: "m linear" },
                  { value: "RL", label: "rolos" },
                ]}
              />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="custo_unitario" label="Custo unitário (opcional)">
            <InputNumber min={0} style={{ width: "100%" }} decimalSeparator="," prefix="R$" />
          </Form.Item>
          <Form.Item name="referencia" label="Referência (OS, pedido, motivo...)">
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item name="observacao" label="Observação">
            <Input.TextArea rows={2} maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
