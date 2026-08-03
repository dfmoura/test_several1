import { MinusCircleOutlined, PlusOutlined, SendOutlined, StopOutlined } from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { api, apiErrorMessage, fmtDate, fmtDateTime, fmtMoney, fmtQty } from "../api";
import type { Product, PurchaseOrder, Requisition, Supplier } from "../types";

const statusTag = (status: string) => {
  const map: Record<string, { color: string; label: string }> = {
    RASCUNHO: { color: "default", label: "Rascunho" },
    ENVIADO: { color: "blue", label: "Enviado ao fornecedor" },
    RECEBIDO: { color: "green", label: "Recebido" },
    CANCELADO: { color: "red", label: "Cancelado" },
  };
  const cfg = map[status] ?? { color: "default", label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

export default function Orders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [msg, contextHolder] = message.useMessage();

  const load = async () => {
    setLoading(true);
    try {
      const [o, s, p, r] = await Promise.all([
        api.get("/purchasing/orders"),
        api.get("/suppliers"),
        api.get("/products"),
        api.get("/purchasing/requisitions"),
      ]);
      setOrders(o.data);
      setSuppliers(s.data);
      setProducts(p.data);
      setRequisitions(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const values = await form.validateFields();
    const items = (values.items ?? []).map((item: any) => {
      const product = products.find((p) => p.id === item.product_id);
      return {
        ...item,
        descricao: item.descricao || product?.descricao || "",
        unidade: item.unidade || product?.unidade || "M2",
        preco_unitario: item.preco_unitario ?? 0,
      };
    });
    setSaving(true);
    try {
      await api.post("/purchasing/orders", {
        ...values,
        previsao_entrega: values.previsao_entrega?.format("YYYY-MM-DD") ?? null,
        items,
      });
      msg.success("Pedido criado.");
      setCreateOpen(false);
      form.resetFields();
      await load();
    } catch (err) {
      msg.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (order: PurchaseOrder, status: string) => {
    try {
      await api.post(`/purchasing/orders/${order.id}/status?status=${status}`);
      await load();
    } catch (err) {
      msg.error(apiErrorMessage(err));
    }
  };

  const orderTotal = (o: PurchaseOrder) =>
    o.items.reduce((sum, i) => sum + i.quantidade * i.preco_unitario, 0);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {contextHolder}
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
        Novo pedido de compra
      </Button>

      <Table<PurchaseOrder>
        rowKey="id"
        loading={loading}
        dataSource={orders}
        pagination={{ pageSize: 15 }}
        columns={[
          { title: "Nº", dataIndex: "id", width: 60 },
          { title: "Criado em", dataIndex: "created_at", width: 165, render: fmtDateTime },
          {
            title: "Fornecedor",
            render: (_, r) => r.supplier?.nome_fantasia ?? r.supplier?.razao_social ?? "-",
          },
          {
            title: "Previsão entrega",
            dataIndex: "previsao_entrega",
            width: 135,
            render: (v) => fmtDate(v),
          },
          {
            title: "Total",
            width: 130,
            align: "right",
            render: (_, r) => fmtMoney(orderTotal(r)),
          },
          { title: "Status", dataIndex: "status", width: 170, render: statusTag },
          {
            title: "Ações",
            width: 190,
            render: (_, r) => (
              <Space>
                {r.status === "RASCUNHO" && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => setStatus(r, "ENVIADO")}
                  >
                    Enviar
                  </Button>
                )}
                {["RASCUNHO", "ENVIADO"].includes(r.status) && (
                  <Button
                    size="small"
                    danger
                    icon={<StopOutlined />}
                    onClick={() => setStatus(r, "CANCELADO")}
                  >
                    Cancelar
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
        expandable={{
          expandedRowRender: (o) => (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={o.items}
              columns={[
                { title: "Descrição", dataIndex: "descricao" },
                {
                  title: "Quantidade",
                  width: 140,
                  align: "right" as const,
                  render: (_: any, i: any) => `${fmtQty(i.quantidade)} ${i.unidade}`,
                },
                {
                  title: "Preço unit.",
                  dataIndex: "preco_unitario",
                  width: 120,
                  align: "right" as const,
                  render: (v: number) => fmtMoney(v),
                },
                {
                  title: "Total",
                  width: 130,
                  align: "right" as const,
                  render: (_: any, i: any) => fmtMoney(i.quantidade * i.preco_unitario),
                },
              ]}
            />
          ),
        }}
      />

      <Modal
        title="Novo pedido de compra"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={create}
        okText="Criar pedido"
        confirmLoading={saving}
        width={860}
      >
        <Form form={form} layout="vertical" initialValues={{ items: [{}] }}>
          <Space style={{ display: "flex" }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="supplier_id" label="Fornecedor" rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: s.nome_fantasia || s.razao_social,
                }))}
              />
            </Form.Item>
            <Form.Item name="requisition_id" label="Requisição de origem (opcional)">
              <Select
                allowClear
                options={requisitions
                  .filter((r) => ["ABERTA", "APROVADA"].includes(r.status))
                  .map((r) => ({
                    value: r.id,
                    label: `#${r.id} — ${r.solicitante ?? "sem solicitante"} (${r.items.length} itens)`,
                  }))}
              />
            </Form.Item>
          </Space>
          <Space style={{ display: "flex" }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="previsao_entrega" label="Previsão de entrega">
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="condicao_pagamento" label="Condição de pagamento">
              <Input maxLength={100} placeholder="ex.: 28/35/42 dias" />
            </Form.Item>
          </Space>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="baseline" style={{ display: "flex" }}>
                    <Form.Item name={[name, "product_id"]} style={{ width: 260 }}>
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Produto (opcional)"
                        options={products.map((p) => ({
                          value: p.id,
                          label: `${p.descricao}${p.largura_mm ? ` ${p.largura_mm}mm` : ""}`,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item name={[name, "descricao"]} style={{ width: 180 }}>
                      <Input placeholder="ou descrição livre" />
                    </Form.Item>
                    <Form.Item
                      name={[name, "quantidade"]}
                      rules={[{ required: true, message: "Qtd" }]}
                    >
                      <InputNumber placeholder="Qtd" min={0.001} decimalSeparator="," />
                    </Form.Item>
                    <Form.Item name={[name, "unidade"]}>
                      <Select
                        placeholder="Un."
                        style={{ width: 85 }}
                        options={["M2", "ML", "RL", "UN", "KG"].map((u) => ({ value: u, label: u }))}
                      />
                    </Form.Item>
                    <Form.Item name={[name, "preco_unitario"]}>
                      <InputNumber placeholder="R$ unit." min={0} decimalSeparator="," />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()}>
                  Adicionar item
                </Button>
              </>
            )}
          </Form.List>
          <Form.Item name="observacao" label="Observação" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
