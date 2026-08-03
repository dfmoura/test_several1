import { CheckOutlined, CloseOutlined, InboxOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Descriptions,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage, fmtCnpj, fmtDate, fmtDateTime, fmtMoney, fmtQty } from "../api";
import type { Nfe, NfeItem, Product } from "../types";

const statusTag = (status: string) => {
  const map: Record<string, { color: string; label: string }> = {
    PENDENTE: { color: "gold", label: "Pendente de aceite" },
    ACEITA: { color: "green", label: "Aceita" },
    REJEITADA: { color: "red", label: "Rejeitada" },
  };
  const cfg = map[status] ?? { color: "default", label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

function guessGroup(descricao: string): string | undefined {
  const d = descricao.toUpperCase();
  if (d.includes("TERMICO") || d.includes("TÉRMICO")) return "TERMICO";
  if (d.includes("COUCHE") || d.includes("COUCHÊ")) return "COUCHE";
  if (d.includes("BOPP")) return "BOPP";
  if (d.includes("FOSCO")) return "FOSCO";
  if (d.includes("RIBBON") || d.includes("CERA") || d.includes("RESINA")) return "RIBBON";
  if (d.includes("TINTA") || d.includes("ETISTAR")) return "TINTAS";
  if (d.includes("TAG")) return "TAG";
  return undefined;
}

interface AcceptState {
  nfe: Nfe;
  // por item: product_id escolhido ou null com createNew=true
  choices: Record<number, { productId: number | null; createNew: boolean }>;
}

export default function NfePage() {
  const [nfes, setNfes] = useState<Nfe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accept, setAccept] = useState<AcceptState | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [msg, contextHolder] = message.useMessage();

  const load = async () => {
    setLoading(true);
    try {
      const [nfeRes, prodRes] = await Promise.all([api.get("/nfe"), api.get("/products")]);
      setNfes(nfeRes.data);
      setProducts(prodRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.descricao}${p.largura_mm ? ` ${p.largura_mm}mm` : ""}${p.gramatura ? ` ${p.gramatura}` : ""} (${p.unidade})`,
      })),
    [products]
  );

  const handleUpload = async (fileList: File[]) => {
    const form = new FormData();
    fileList.forEach((f) => form.append("files", f));
    setUploading(true);
    try {
      const res = await api.post("/nfe/upload", form);
      msg.success(`${res.data.length} NF-e(s) importada(s). Confira e dê o aceite.`);
      await load();
    } catch (err) {
      msg.error(apiErrorMessage(err), 8);
      await load();
    } finally {
      setUploading(false);
    }
  };

  const openAccept = (nfe: Nfe) => {
    const choices: AcceptState["choices"] = {};
    nfe.items.forEach((item) => {
      choices[item.id] = { productId: item.product_id ?? null, createNew: !item.product_id };
    });
    setAccept({ nfe, choices });
  };

  const confirmAccept = async () => {
    if (!accept) return;
    const mappings = accept.nfe.items.map((item) => {
      const choice = accept.choices[item.id];
      if (choice.productId) return { item_id: item.id, product_id: choice.productId };
      return {
        item_id: item.id,
        create_product: {
          descricao: item.descricao,
          grupo: guessGroup(item.descricao),
          unidade: ["M2", "ML", "KG", "UN", "RL"].includes(item.unidade) ? item.unidade : "UN",
          ncm: item.ncm,
        },
      };
    });
    setAccepting(true);
    try {
      await api.post(`/nfe/${accept.nfe.id}/accept`, { mappings, gerar_financeiro: true });
      msg.success(
        `NF-e ${accept.nfe.numero} aceita: estoque atualizado e ${accept.nfe.duplicatas.length || 1} parcela(s) lançada(s) no financeiro.`
      );
      setAccept(null);
      await load();
    } catch (err) {
      msg.error(apiErrorMessage(err), 8);
    } finally {
      setAccepting(false);
    }
  };

  const rejectNfe = async (nfe: Nfe) => {
    try {
      await api.post(`/nfe/${nfe.id}/reject`);
      msg.info(`NF-e ${nfe.numero} rejeitada.`);
      await load();
    } catch (err) {
      msg.error(apiErrorMessage(err));
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {contextHolder}
      <Upload.Dragger
        multiple
        accept=".xml"
        showUploadList={false}
        disabled={uploading}
        beforeUpload={(_file, fileList) => {
          handleUpload(fileList as unknown as File[]);
          return false;
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Arraste os XMLs das NF-e aqui (ou clique para selecionar)</p>
        <p className="ant-upload-hint">
          O fornecedor é cadastrado automaticamente e as parcelas da nota vão para o contas a pagar
          após o aceite.
        </p>
      </Upload.Dragger>

      <Table<Nfe>
        rowKey="id"
        loading={loading}
        dataSource={nfes}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: "NF", dataIndex: "numero", width: 90 },
          {
            title: "Fornecedor",
            dataIndex: "emit_nome",
            render: (v, r) => (
              <Tooltip title={fmtCnpj(r.emit_cnpj)}>
                <span>{v}</span>
              </Tooltip>
            ),
          },
          {
            title: "Emissão",
            dataIndex: "emitida_em",
            width: 120,
            render: (v) => fmtDate(v?.slice(0, 10)),
          },
          { title: "Itens", width: 70, render: (_, r) => r.items.length },
          {
            title: "Valor total",
            dataIndex: "valor_total",
            width: 130,
            align: "right",
            render: (v) => fmtMoney(Number(v)),
          },
          {
            title: "Parcelas",
            width: 90,
            render: (_, r) => r.duplicatas.length || "-",
          },
          { title: "Status", dataIndex: "status", width: 150, render: statusTag },
          {
            title: "Ações",
            width: 190,
            render: (_, r) =>
              r.status === "PENDENTE" ? (
                <Space>
                  <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => openAccept(r)}>
                    Dar aceite
                  </Button>
                  <Button danger size="small" icon={<CloseOutlined />} onClick={() => rejectNfe(r)}>
                    Rejeitar
                  </Button>
                </Space>
              ) : (
                <Typography.Text type="secondary">
                  {r.accepted_at ? fmtDateTime(r.accepted_at) : "-"}
                </Typography.Text>
              ),
          },
        ]}
        expandable={{
          expandedRowRender: (nfe) => (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Descriptions size="small" column={3}>
                <Descriptions.Item label="Chave">{nfe.chave}</Descriptions.Item>
                <Descriptions.Item label="ICMS">{fmtMoney(Number(nfe.valor_icms))}</Descriptions.Item>
                <Descriptions.Item label="IPI">{fmtMoney(Number(nfe.valor_ipi))}</Descriptions.Item>
              </Descriptions>
              <Table<NfeItem>
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={nfe.items}
                columns={[
                  { title: "#", dataIndex: "n_item", width: 40 },
                  { title: "Cód. fornecedor", dataIndex: "codigo_fornecedor", width: 130 },
                  { title: "Descrição", dataIndex: "descricao" },
                  { title: "NCM", dataIndex: "ncm", width: 100 },
                  { title: "CFOP", dataIndex: "cfop", width: 70 },
                  {
                    title: "Qtd",
                    width: 120,
                    align: "right",
                    render: (_, i) => `${fmtQty(i.quantidade)} ${i.unidade}`,
                  },
                  {
                    title: "Vlr unit.",
                    dataIndex: "valor_unitario",
                    width: 100,
                    align: "right",
                    render: (v) => fmtMoney(v),
                  },
                  {
                    title: "Total",
                    dataIndex: "valor_total",
                    width: 110,
                    align: "right",
                    render: (v) => fmtMoney(v),
                  },
                  {
                    title: "Produto vinculado",
                    width: 220,
                    render: (_, i) =>
                      i.product ? (
                        <Tag color="blue">{i.product.descricao}</Tag>
                      ) : (
                        <Tag>não vinculado</Tag>
                      ),
                  },
                ]}
              />
              {nfe.duplicatas.length > 0 && (
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={nfe.duplicatas}
                  columns={[
                    { title: "Parcela", dataIndex: "numero", width: 100 },
                    { title: "Vencimento", dataIndex: "vencimento", render: fmtDate, width: 140 },
                    {
                      title: "Valor",
                      dataIndex: "valor",
                      align: "right" as const,
                      render: (v: number) => fmtMoney(Number(v)),
                    },
                  ]}
                />
              )}
            </Space>
          ),
        }}
      />

      <Modal
        title={accept ? `Aceite da NF-e ${accept.nfe.numero} — ${accept.nfe.emit_nome}` : ""}
        open={!!accept}
        width={900}
        onCancel={() => setAccept(null)}
        onOk={confirmAccept}
        okText="Confirmar aceite"
        confirmLoading={accepting}
      >
        {accept && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Alert
              type="info"
              showIcon
              message="Vincule cada item a um produto existente ou deixe marcado para cadastrar automaticamente."
              description={`No aceite: entrada no estoque de ${accept.nfe.items.length} item(ns) e lançamento de ${accept.nfe.duplicatas.length || 1} parcela(s) no contas a pagar (total ${fmtMoney(Number(accept.nfe.valor_total))}).`}
            />
            <Table<NfeItem>
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={accept.nfe.items}
              columns={[
                { title: "#", dataIndex: "n_item", width: 40 },
                {
                  title: "Item da nota",
                  render: (_, i) => (
                    <>
                      <div>{i.descricao}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {fmtQty(i.quantidade)} {i.unidade} · {fmtMoney(i.valor_total)} · NCM {i.ncm}
                      </Typography.Text>
                    </>
                  ),
                },
                {
                  title: "Produto",
                  width: 300,
                  render: (_, i) => (
                    <Select
                      style={{ width: "100%" }}
                      placeholder="Selecionar produto existente"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      options={productOptions}
                      value={accept.choices[i.id]?.productId ?? undefined}
                      onChange={(value) =>
                        setAccept((prev) =>
                          prev
                            ? {
                                ...prev,
                                choices: {
                                  ...prev.choices,
                                  [i.id]: { productId: value ?? null, createNew: !value },
                                },
                              }
                            : prev
                        )
                      }
                    />
                  ),
                },
                {
                  title: "Cadastrar novo",
                  width: 120,
                  align: "center",
                  render: (_, i) => (
                    <Switch
                      checked={accept.choices[i.id]?.createNew && !accept.choices[i.id]?.productId}
                      disabled={!!accept.choices[i.id]?.productId}
                      onChange={(checked) =>
                        setAccept((prev) =>
                          prev
                            ? {
                                ...prev,
                                choices: {
                                  ...prev.choices,
                                  [i.id]: { productId: null, createNew: checked },
                                },
                              }
                            : prev
                        )
                      }
                    />
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Modal>
    </Space>
  );
}
