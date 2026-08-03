import { CalendarOutlined, CheckOutlined, PlusOutlined, StopOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  message,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { api, apiErrorMessage, fmtDate, fmtMoney } from "../api";
import type { Payable, Supplier } from "../types";

const statusTag = (status: string, vencimento: string) => {
  const overdue =
    ["ABERTO", "PROGRAMADO"].includes(status) && dayjs(vencimento).isBefore(dayjs(), "day");
  if (overdue) return <Tag color="red">Vencida</Tag>;
  const map: Record<string, { color: string; label: string }> = {
    ABERTO: { color: "gold", label: "Em aberto" },
    PROGRAMADO: { color: "blue", label: "Programada" },
    PAGO: { color: "green", label: "Paga" },
    CANCELADO: { color: "default", label: "Cancelada" },
  };
  const cfg = map[status] ?? { color: "default", label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

const formasPagamento = ["PIX", "Boleto", "Transferência", "Cartão", "Dinheiro"].map((v) => ({
  value: v,
  label: v,
}));

export default function Finance() {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<Payable | null>(null);
  const [payTarget, setPayTarget] = useState<Payable | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [scheduleForm] = Form.useForm();
  const [payForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [msg, contextHolder] = message.useMessage();

  const load = async () => {
    setLoading(true);
    try {
      const [p, s, sum] = await Promise.all([
        api.get("/finance/payables"),
        api.get("/suppliers"),
        api.get("/finance/payables/summary"),
      ]);
      setPayables(p.data);
      setSuppliers(s.data);
      setSummary(sum.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const doSchedule = async () => {
    const values = await scheduleForm.validateFields();
    try {
      await api.post(`/finance/payables/${scheduleTarget!.id}/schedule`, {
        data_programada: values.data_programada.format("YYYY-MM-DD"),
        forma_pagamento: values.forma_pagamento,
      });
      msg.success("Pagamento programado.");
      setScheduleTarget(null);
      scheduleForm.resetFields();
      await load();
    } catch (err) {
      msg.error(apiErrorMessage(err));
    }
  };

  const doPay = async () => {
    const values = await payForm.validateFields();
    try {
      await api.post(`/finance/payables/${payTarget!.id}/pay`, {
        data_pagamento: values.data_pagamento.format("YYYY-MM-DD"),
        valor_pago: values.valor_pago,
        forma_pagamento: values.forma_pagamento,
      });
      msg.success("Baixa registrada.");
      setPayTarget(null);
      payForm.resetFields();
      await load();
    } catch (err) {
      msg.error(apiErrorMessage(err));
    }
  };

  const doCancel = async (p: Payable) => {
    try {
      await api.post(`/finance/payables/${p.id}/cancel`);
      msg.info("Conta cancelada.");
      await load();
    } catch (err) {
      msg.error(apiErrorMessage(err));
    }
  };

  const doCreate = async () => {
    const values = await createForm.validateFields();
    try {
      await api.post("/finance/payables", {
        ...values,
        vencimento: values.vencimento.format("YYYY-MM-DD"),
      });
      msg.success("Conta lançada.");
      setCreateOpen(false);
      createForm.resetFields();
      await load();
    } catch (err) {
      msg.error(apiErrorMessage(err));
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {contextHolder}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Vencidas"
              value={summary.vencidas ?? 0}
              precision={2}
              prefix="R$"
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Vence hoje" value={summary.vence_hoje ?? 0} precision={2} prefix="R$" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Próximos 30 dias"
              value={summary.proximos_30_dias ?? 0}
              precision={2}
              prefix="R$"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total em aberto" value={summary.total_aberto ?? 0} precision={2} prefix="R$" />
          </Card>
        </Col>
      </Row>

      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
        Lançar conta manual
      </Button>

      <Table<Payable>
        rowKey="id"
        loading={loading}
        dataSource={payables}
        pagination={{ pageSize: 15 }}
        columns={[
          { title: "Vencimento", dataIndex: "vencimento", width: 115, render: fmtDate,
            sorter: (a, b) => a.vencimento.localeCompare(b.vencimento), defaultSortOrder: "ascend" },
          { title: "Descrição", dataIndex: "descricao" },
          {
            title: "Fornecedor",
            width: 220,
            render: (_, r) => r.supplier?.nome_fantasia ?? r.supplier?.razao_social ?? "-",
          },
          { title: "Parcela", dataIndex: "parcela", width: 80, render: (v) => v ?? "-" },
          {
            title: "Valor",
            dataIndex: "valor",
            width: 120,
            align: "right",
            render: (v) => fmtMoney(Number(v)),
          },
          {
            title: "Status",
            width: 110,
            filters: [
              { text: "Em aberto", value: "ABERTO" },
              { text: "Programada", value: "PROGRAMADO" },
              { text: "Paga", value: "PAGO" },
              { text: "Cancelada", value: "CANCELADO" },
            ],
            onFilter: (v, r) => r.status === v,
            render: (_, r) => statusTag(r.status, r.vencimento),
          },
          {
            title: "Programada p/",
            dataIndex: "data_programada",
            width: 120,
            render: (v) => fmtDate(v),
          },
          {
            title: "Pagamento",
            width: 140,
            render: (_, r) =>
              r.data_pagamento
                ? `${fmtDate(r.data_pagamento)} (${fmtMoney(Number(r.valor_pago))})`
                : "-",
          },
          {
            title: "Ações",
            width: 220,
            render: (_, r) =>
              ["ABERTO", "PROGRAMADO"].includes(r.status) ? (
                <Space>
                  <Button
                    size="small"
                    icon={<CalendarOutlined />}
                    onClick={() => {
                      setScheduleTarget(r);
                      scheduleForm.setFieldsValue({
                        data_programada: dayjs(r.data_programada ?? r.vencimento),
                        forma_pagamento: r.forma_pagamento,
                      });
                    }}
                  >
                    Programar
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => {
                      setPayTarget(r);
                      payForm.setFieldsValue({
                        data_pagamento: dayjs(),
                        valor_pago: Number(r.valor),
                        forma_pagamento: r.forma_pagamento,
                      });
                    }}
                  >
                    Pagar
                  </Button>
                  <Button size="small" danger icon={<StopOutlined />} onClick={() => doCancel(r)} />
                </Space>
              ) : null,
          },
        ]}
      />

      <Modal
        title={`Programar pagamento — ${scheduleTarget?.descricao ?? ""}`}
        open={!!scheduleTarget}
        onCancel={() => setScheduleTarget(null)}
        onOk={doSchedule}
        okText="Programar"
      >
        <Form form={scheduleForm} layout="vertical">
          <Form.Item name="data_programada" label="Data programada" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="forma_pagamento" label="Forma de pagamento">
            <Select allowClear options={formasPagamento} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Registrar pagamento — ${payTarget?.descricao ?? ""}`}
        open={!!payTarget}
        onCancel={() => setPayTarget(null)}
        onOk={doPay}
        okText="Confirmar baixa"
      >
        <Form form={payForm} layout="vertical">
          <Form.Item name="data_pagamento" label="Data do pagamento" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="valor_pago" label="Valor pago" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} decimalSeparator="," prefix="R$" />
          </Form.Item>
          <Form.Item name="forma_pagamento" label="Forma de pagamento">
            <Select allowClear options={formasPagamento} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Lançar conta a pagar manual"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={doCreate}
        okText="Lançar"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="descricao" label="Descrição" rules={[{ required: true }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="supplier_id" label="Fornecedor (opcional)">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={suppliers.map((s) => ({
                value: s.id,
                label: s.nome_fantasia || s.razao_social,
              }))}
            />
          </Form.Item>
          <Form.Item name="vencimento" label="Vencimento" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="valor" label="Valor" rules={[{ required: true }]}>
            <InputNumber min={0.01} style={{ width: "100%" }} decimalSeparator="," prefix="R$" />
          </Form.Item>
          <Form.Item name="parcela" label="Parcela (ex.: 1/3)">
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item name="observacao" label="Observação">
            <Input.TextArea rows={2} maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
