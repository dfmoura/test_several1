import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Space, Switch, Table, Tag, message } from "antd";
import { useEffect, useState } from "react";
import { api, apiErrorMessage, fmtCnpj } from "../api";
import type { Supplier } from "../types";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Supplier | null | "new">(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [msg, contextHolder] = message.useMessage();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/suppliers", { params: search ? { search } : {} });
      setSuppliers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  const openEdit = (supplier: Supplier | "new") => {
    setEditing(supplier);
    form.resetFields();
    if (supplier !== "new") form.setFieldsValue(supplier);
  };

  const lookupCnpj = async () => {
    const cnpj = form.getFieldValue("cnpj");
    if (!cnpj) return msg.warning("Informe o CNPJ primeiro.");
    setLookupLoading(true);
    try {
      const res = await api.get(`/external/cnpj/${cnpj.replace(/\D/g, "")}`);
      form.setFieldsValue(res.data);
      msg.success(`Dados carregados da Receita: ${res.data.razao_social}`);
    } catch (err) {
      msg.error(apiErrorMessage(err));
    } finally {
      setLookupLoading(false);
    }
  };

  const lookupCep = async () => {
    const cep = form.getFieldValue("cep");
    if (!cep) return msg.warning("Informe o CEP primeiro.");
    setLookupLoading(true);
    try {
      const res = await api.get(`/external/cep/${cep.replace(/\D/g, "")}`);
      form.setFieldsValue(res.data);
    } catch (err) {
      msg.error(apiErrorMessage(err));
    } finally {
      setLookupLoading(false);
    }
  };

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing === "new") {
        await api.post("/suppliers", values);
        msg.success("Fornecedor cadastrado.");
      } else if (editing) {
        await api.put(`/suppliers/${editing.id}`, values);
        msg.success("Fornecedor atualizado.");
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
          placeholder="Buscar por nome ou CNPJ"
          allowClear
          style={{ width: 320 }}
          onSearch={setSearch}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit("new")}>
          Novo fornecedor
        </Button>
      </Space>

      <Table<Supplier>
        rowKey="id"
        loading={loading}
        dataSource={suppliers}
        pagination={{ pageSize: 15 }}
        onRow={(r) => ({ onClick: () => openEdit(r), style: { cursor: "pointer" } })}
        columns={[
          { title: "CNPJ", dataIndex: "cnpj", width: 170, render: fmtCnpj },
          { title: "Razão social", dataIndex: "razao_social" },
          { title: "Fantasia", dataIndex: "nome_fantasia", render: (v) => v ?? "-" },
          {
            title: "Cidade/UF",
            width: 200,
            render: (_, r) => (r.municipio ? `${r.municipio}/${r.uf}` : "-"),
          },
          { title: "Telefone", dataIndex: "telefone", width: 140, render: (v) => v ?? "-" },
          {
            title: "Situação",
            dataIndex: "ativo",
            width: 100,
            render: (v) => (v ? <Tag color="green">Ativo</Tag> : <Tag>Inativo</Tag>),
          },
        ]}
      />

      <Modal
        title={editing === "new" ? "Novo fornecedor" : "Editar fornecedor"}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={save}
        okText="Salvar"
        confirmLoading={saving}
        width={720}
      >
        <Form form={form} layout="vertical" initialValues={{ ativo: true }}>
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item name="cnpj" label="CNPJ" style={{ flex: 1 }} rules={[{ required: true }]}>
              <Input placeholder="00.000.000/0000-00" maxLength={18} />
            </Form.Item>
            <Form.Item label=" ">
              <Button icon={<SearchOutlined />} loading={lookupLoading} onClick={lookupCnpj}>
                Buscar na Receita
              </Button>
            </Form.Item>
          </Space.Compact>
          <Form.Item name="razao_social" label="Razão social" rules={[{ required: true }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Space style={{ display: "flex" }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="nome_fantasia" label="Nome fantasia">
              <Input maxLength={255} />
            </Form.Item>
            <Form.Item name="ie" label="Inscrição estadual">
              <Input maxLength={20} />
            </Form.Item>
          </Space>
          <Space style={{ display: "flex" }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="email" label="E-mail">
              <Input maxLength={255} />
            </Form.Item>
            <Form.Item name="telefone" label="Telefone">
              <Input maxLength={30} />
            </Form.Item>
          </Space>
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item name="cep" label="CEP" style={{ width: 180 }}>
              <Input maxLength={9} />
            </Form.Item>
            <Form.Item label=" ">
              <Button icon={<SearchOutlined />} loading={lookupLoading} onClick={lookupCep}>
                Buscar CEP
              </Button>
            </Form.Item>
          </Space.Compact>
          <Space style={{ display: "flex" }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="logradouro" label="Logradouro" style={{ flex: 3 }}>
              <Input maxLength={255} />
            </Form.Item>
            <Form.Item name="numero" label="Número" style={{ width: 120 }}>
              <Input maxLength={20} />
            </Form.Item>
          </Space>
          <Space style={{ display: "flex" }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="bairro" label="Bairro">
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="municipio" label="Município">
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="uf" label="UF" style={{ width: 80 }}>
              <Input maxLength={2} />
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
