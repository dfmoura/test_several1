import { PlusOutlined } from "@ant-design/icons";
import {
  AutoComplete,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage, fmtMoney, fmtQty } from "../api";
import type { Product } from "../types";

const unidades = [
  { value: "M2", label: "m² (metro quadrado)" },
  { value: "ML", label: "m (metro linear)" },
  { value: "RL", label: "Rolo / bobina" },
  { value: "UN", label: "Unidade" },
  { value: "KG", label: "Quilograma" },
];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null | "new">(null);
  const [saving, setSaving] = useState(false);
  const [ncmOptions, setNcmOptions] = useState<{ value: string; label: string }[]>([]);
  const [form] = Form.useForm();
  const [msg, contextHolder] = message.useMessage();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/products", { params: search ? { search } : {} });
      setProducts(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  const grupos = useMemo(
    () => [...new Set(products.map((p) => p.grupo).filter(Boolean))] as string[],
    [products]
  );

  const searchNcm = async (value: string) => {
    if (!value || value.length < 3) return setNcmOptions([]);
    try {
      const res = await api.get("/external/ncm", { params: { search: value } });
      setNcmOptions(
        res.data.map((n: any) => ({
          value: n.codigo?.replace(/\D/g, ""),
          label: `${n.codigo} — ${n.descricao}`,
        }))
      );
    } catch {
      setNcmOptions([]);
    }
  };

  const openEdit = (product: Product | "new") => {
    setEditing(product);
    form.resetFields();
    if (product !== "new") form.setFieldsValue(product);
  };

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing === "new") {
        await api.post("/products", values);
        msg.success("Produto cadastrado.");
      } else if (editing) {
        await api.put(`/products/${editing.id}`, values);
        msg.success("Produto atualizado.");
      }
      setEditing(null);
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
      <Space>
        <Input.Search
          placeholder="Buscar por descrição ou SKU"
          allowClear
          style={{ width: 320 }}
          onSearch={setSearch}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit("new")}>
          Novo produto
        </Button>
      </Space>

      <Table<Product>
        rowKey="id"
        loading={loading}
        dataSource={products}
        pagination={{ pageSize: 15 }}
        onRow={(r) => ({ onClick: () => openEdit(r), style: { cursor: "pointer" } })}
        columns={[
          {
            title: "Grupo",
            dataIndex: "grupo",
            width: 110,
            filters: grupos.map((g) => ({ text: g, value: g })),
            onFilter: (v, r) => r.grupo === v,
            render: (v) => (v ? <Tag>{v}</Tag> : "-"),
          },
          { title: "Descrição", dataIndex: "descricao" },
          {
            title: "Largura",
            dataIndex: "largura_mm",
            width: 95,
            render: (v) => (v ? `${fmtQty(v, 0)} mm` : "-"),
          },
          {
            title: "Comprimento",
            dataIndex: "comprimento_m",
            width: 115,
            render: (v) => (v ? `${fmtQty(v, 0)} m` : "-"),
          },
          { title: "Gramatura", dataIndex: "gramatura", width: 95, render: (v) => v ?? "-" },
          { title: "Un.", dataIndex: "unidade", width: 60 },
          { title: "NCM", dataIndex: "ncm", width: 100, render: (v) => v ?? "-" },
          { title: "Local", dataIndex: "localizacao", width: 80, render: (v) => v ?? "-" },
          {
            title: "Custo médio",
            dataIndex: "custo_medio",
            width: 115,
            align: "right",
            render: (v) => (v ? fmtMoney(v) : "-"),
          },
          {
            title: "Situação",
            dataIndex: "ativo",
            width: 95,
            render: (v) => (v ? <Tag color="green">Ativo</Tag> : <Tag>Inativo</Tag>),
          },
        ]}
      />

      <Modal
        title={editing === "new" ? "Novo produto" : "Editar produto"}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={save}
        okText="Salvar"
        confirmLoading={saving}
        width={720}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ unidade: "M2", estoque_minimo: 0, ativo: true }}
        >
          <Form.Item name="descricao" label="Descrição" rules={[{ required: true }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Space style={{ display: "flex" }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="grupo" label="Grupo (FOSCO, COUCHE, TERMICO, BOPP...)">
              <AutoComplete
                options={grupos.map((g) => ({ value: g }))}
                filterOption={(input, option) =>
                  (option?.value ?? "").toUpperCase().includes(input.toUpperCase())
                }
              >
                <Input maxLength={100} style={{ textTransform: "uppercase" }} />
              </AutoComplete>
            </Form.Item>
            <Form.Item name="sku" label="SKU / código interno">
              <Input maxLength={50} />
            </Form.Item>
            <Form.Item name="unidade" label="Unidade de controle" rules={[{ required: true }]}>
              <Select options={unidades} />
            </Form.Item>
          </Space>
          <Space style={{ display: "flex" }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="largura_mm" label="Largura da bobina (mm)">
              <InputNumber min={0} style={{ width: "100%" }} decimalSeparator="," />
            </Form.Item>
            <Form.Item name="comprimento_m" label="Comprimento do rolo (m)">
              <InputNumber min={0} style={{ width: "100%" }} decimalSeparator="," />
            </Form.Item>
            <Form.Item name="gramatura" label="Gramatura">
              <Input maxLength={20} placeholder="ex.: 80G" />
            </Form.Item>
          </Space>
          <Form.Item
            name="ncm"
            label="NCM (digite código ou descrição para buscar na tabela oficial)"
          >
            <AutoComplete options={ncmOptions} onSearch={searchNcm} placeholder="ex.: 48114190 ou 'papel termico'" />
          </Form.Item>
          <Space style={{ display: "flex" }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="localizacao" label="Localização no estoque">
              <Input maxLength={50} placeholder="ex.: prateleira 38" />
            </Form.Item>
            <Form.Item name="estoque_minimo" label="Estoque mínimo (na unidade de controle)">
              <InputNumber min={0} style={{ width: "100%" }} decimalSeparator="," />
            </Form.Item>
          </Space>
          <Form.Item name="observacao" label="Observação">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="ativo" label="Ativo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
