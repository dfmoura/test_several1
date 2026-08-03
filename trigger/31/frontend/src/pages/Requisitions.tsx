import { CheckOutlined, CloseOutlined, MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
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
import { api, apiErrorMessage, fmtDateTime, fmtQty } from "../api";
import type { Product, Requisition } from "../types";

const statusTag = (status: string) => {
  const map: Record<string, { color: string; label: string }> = {
    ABERTA: { color: "gold", label: "Aberta" },
    APROVADA: { color: "blue", label: "Aprovada" },
    REPROVADA: { color: "red", label: "Reprovada" },
    ATENDIDA: { color: "green", label: "Atendida" },
  };
  const cfg = map[status] ?? { color: "default", label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

export default function Requisitions() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [msg, contextHolder] = message.useMessage();

  const load = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([api.get("/purchasing/requisitions"), api.get("/products")]);
      setRequisitions(r.data);
      setProducts(p.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.descricao}${p.largura_mm ? ` ${p.largura_mm}mm` : ""} (${p.unidade})`,
  }));

  const create = async () => {
    const values = await form.validateFields();
    const items = (values.items ?? []).map((item: any) => {
      const product = products.find((p) => p.id === item.product_id);
      return {
        ...item,
        descricao: item.descricao || product?.descricao || "",
        unidade: item.unidade || product?.unidade || "M2",
      };
    });
    setSaving(true);
    try {
      await api.post("/purchasing/requisitions", { ...values, items });
      msg.success("Requisição criada.");
      setCreateOpen(false);
      form.resetFields();
      await load();
    } catch (err) {
      msg.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (req: Requisition, status: string) => {
    try {
      await api.post(`/purchasing/requisitions/${req.id}/status?status=${status}`);
      await load();
    } catch (err) {
      msg.error(apiErrorMessage(err));
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {contextHolder}
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
        Nova requisição de compra
      </Button>

      <Table<Requisition>
        rowKey="id"
        loading={loading}
        dataSource={requisitions}
        pagination={{ pageSize: 15 }}
        columns={[
          { title: "Nº", dataIndex: "id", width: 60 },
          { title: "Criada em", dataIndex: "created_at", width: 170, render: fmtDateTime },
          { title: "Solicitante", dataIndex: "solicitante", render: (v) => v ?? "-" },
          { title: "Itens", width: 70, render: (_, r) => r.items.length },
          { title: "Status", dataIndex: "status", width: 110, render: statusTag },
          { title: "Observação", dataIndex: "observacao", render: (v) => v ?? "-" },
          {
            title: "Ações",
            width: 200,
            render: (_, r) =>
              r.status === "ABERTA" ? (
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => setStatus(r, "APROVADA")}
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => setStatus(r, "REPROVADA")}
                  >
                    Reprovar
                  </Button>
                </Space>
              ) : null,
          },
        ]}
        expandable={{
          expandedRowRender: (r) => (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={r.items}
              columns={[
                { title: "Descrição", dataIndex: "descricao" },
                {
                  title: "Quantidade",
                  width: 150,
                  align: "right" as const,
                  render: (_: any, i: any) => `${fmtQty(i.quantidade)} ${i.unidade}`,
                },
                { title: "Observação", dataIndex: "observacao", render: (v: any) => v ?? "-" },
              ]}
            />
          ),
        }}
      />

      <Modal
        title="Nova requisição de compra"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={create}
        okText="Criar requisição"
        confirmLoading={saving}
        width={760}
      >
        <Form form={form} layout="vertical" initialValues={{ items: [{}] }}>
          <Space style={{ display: "flex" }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="solicitante" label="Solicitante">
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="observacao" label="Observação">
              <Input maxLength={255} />
            </Form.Item>
          </Space>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="baseline" style={{ display: "flex" }}>
                    <Form.Item name={[name, "product_id"]} style={{ width: 280 }}>
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Produto cadastrado (opcional)"
                        options={productOptions}
                      />
                    </Form.Item>
                    <Form.Item name={[name, "descricao"]} style={{ width: 200 }}>
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
                        style={{ width: 90 }}
                        options={["M2", "ML", "RL", "UN", "KG"].map((u) => ({ value: u, label: u }))}
                      />
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
        </Form>
      </Modal>
    </Space>
  );
}
