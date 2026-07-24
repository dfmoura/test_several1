import { getBillingAdapter, getNfeAdapter } from "../adapters/index.js";
import { pool, withTransaction } from "../db/pool.js";
import { nextDocNumber } from "../lib/doc-number.js";
import { emitOutboxEvent } from "../lib/outbox.js";
import { badRequest, notFound } from "../lib/errors.js";
import { getOrder } from "./order.service.js";
import { hasRole } from "./org.service.js";
import { resolveOrgId } from "./org.service.js";

export async function listBillableOrders(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT so.id, so.number, so.status, so.order_date, so.payment_terms,
            p.legal_name AS customer_name,
            COALESCE(SUM(sol.line_total), 0) AS total_amount,
            COUNT(wo.id) AS wo_total,
            COUNT(wo.id) FILTER (WHERE wo.status = 'concluida') AS wo_done
     FROM commercial.sales_orders so
     JOIN party.parties p ON p.id = so.customer_id
     LEFT JOIN commercial.sales_order_lines sol ON sol.sales_order_id = so.id
     LEFT JOIN pcp.work_orders wo ON wo.sales_order_line_id = sol.id
     WHERE so.organization_id = $1
       AND so.deleted_at IS NULL
       AND so.status NOT IN ('cancelado', 'faturado', 'entregue', 'encerrado')
       AND NOT EXISTS (
         SELECT 1 FROM billing.invoices i
         WHERE i.sales_order_id = so.id AND i.status != 'cancelada'
       )
     GROUP BY so.id, p.legal_name
     ORDER BY so.created_at DESC`,
    [organizationId],
  );
  return result.rows.map((r) => ({
    ...r,
    ready: Number(r.wo_total) > 0 && Number(r.wo_total) === Number(r.wo_done),
  }));
}

export async function listInvoices(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT i.*,
            so.number AS order_number,
            p.legal_name AS customer_name,
            (
              SELECT fd.status FROM billing.fiscal_documents fd
              WHERE fd.invoice_id = i.id
              ORDER BY fd.created_at DESC LIMIT 1
            ) AS fiscal_status,
            (
              SELECT c.status FROM billing.charges c
              WHERE c.invoice_id = i.id
              ORDER BY c.created_at DESC LIMIT 1
            ) AS charge_status
     FROM billing.invoices i
     JOIN commercial.sales_orders so ON so.id = i.sales_order_id
     JOIN party.parties p ON p.id = so.customer_id
     WHERE i.organization_id = $1
     ORDER BY i.created_at DESC`,
    [organizationId],
  );
  return result.rows;
}

export async function getInvoice(id: string, orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const invoice = await pool.query(
    `SELECT * FROM billing.invoices WHERE id = $1 AND organization_id = $2`,
    [id, organizationId],
  );
  if (!invoice.rows[0]) throw notFound("Fatura");
  const fiscal = await pool.query(
    `SELECT * FROM billing.fiscal_documents WHERE invoice_id = $1 ORDER BY created_at DESC`,
    [id],
  );
  const charges = await pool.query(
    `SELECT * FROM billing.charges WHERE invoice_id = $1 ORDER BY created_at DESC`,
    [id],
  );
  return { ...invoice.rows[0], fiscalDocuments: fiscal.rows, charges: charges.rows };
}

async function checkWorkOrdersComplete(salesOrderId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT count(*) FILTER (WHERE wo.status != 'concluida') AS pending,
            count(*) AS total
     FROM commercial.sales_order_lines sol
     LEFT JOIN pcp.work_orders wo ON wo.sales_order_line_id = sol.id
     WHERE sol.sales_order_id = $1`,
    [salesOrderId],
  );
  const row = result.rows[0];
  if (Number(row.total) === 0) return false;
  return Number(row.pending) === 0;
}

export async function createInvoice(
  orgId: string | undefined,
  salesOrderId: string,
  options?: { managerOverride?: boolean; userRoles?: string[] },
) {
  const organizationId = await resolveOrgId(orgId);
  const order = await getOrder(salesOrderId, organizationId);
  if (order.status === "cancelado") throw badRequest("Pedido cancelado não pode ser faturado.");

  const woComplete = await checkWorkOrdersComplete(salesOrderId);
  if (!woComplete && !(options?.managerOverride && hasRole(options.userRoles ?? [], "gerente", "admin"))) {
    throw badRequest("Todas as ordens de serviço precisam estar concluídas (ou override de gerente).");
  }

  const lines = order.lines as Array<{ line_total: string }>;
  const totalAmount = lines.reduce((s, l) => s + Number(l.line_total), 0);

  return withTransaction(async (client) => {
    const number = await nextDocNumber(client, organizationId, "invoice");
    const invoiceResult = await client.query(
      `INSERT INTO billing.invoices
         (organization_id, number, sales_order_id, status, issue_date, total_amount)
       VALUES ($1,$2,$3,'rascunho',CURRENT_DATE,$4)
       RETURNING *`,
      [organizationId, number, salesOrderId, totalAmount],
    );
    const invoice = invoiceResult.rows[0];
    await emitOutboxEvent(client, "invoice.created", "invoice", invoice.id as string, {
      salesOrderId,
      number,
    });
    await client.query(
      `UPDATE commercial.sales_orders SET status = 'faturado', updated_at = now() WHERE id = $1`,
      [salesOrderId],
    );
    return invoice.id as string;
  }).then((invoiceId) => getInvoice(invoiceId, organizationId));
}

export async function emitNfe(invoiceId: string, orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const invoice = await getInvoice(invoiceId, organizationId);
  if (invoice.status === "cancelada") throw badRequest("Fatura cancelada.");

  const order = await getOrder(invoice.sales_order_id as string, organizationId);
  const customer = await pool.query(
    `SELECT p.document, p.legal_name FROM party.customers c
     JOIN party.parties p ON p.id = c.party_id WHERE c.party_id = $1`,
    [order.customer_id],
  );

  const nfe = getNfeAdapter();
  const result = await nfe.authorize({
    invoiceId,
    invoiceNumber: invoice.number as string,
    totalAmount: Number(invoice.total_amount),
    customerDocument: customer.rows[0]?.document as string | undefined,
  });

  return withTransaction(async (client) => {
    const doc = await client.query(
      `INSERT INTO billing.fiscal_documents
         (invoice_id, doc_model, status, access_key, protocol, hub_provider, hub_ref,
          xml_object_key, pdf_object_key, payload)
       VALUES ($1,'nfe','autorizada',$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        invoiceId,
        result.accessKey,
        result.protocol,
        result.hubProvider,
        result.hubRef,
        result.xmlObjectKey,
        result.pdfObjectKey,
        JSON.stringify(result.payload),
      ],
    );
    await client.query(
      `UPDATE billing.invoices SET status = 'pronta', updated_at = now() WHERE id = $1`,
      [invoiceId],
    );
    await emitOutboxEvent(client, "nfe.authorized", "invoice", invoiceId, {
      accessKey: result.accessKey,
    });
    return { fiscalDocument: doc.rows[0], invoice: await getInvoice(invoiceId, organizationId) };
  });
}

export async function emitCharge(invoiceId: string, orgId?: string, dueDate?: string) {
  const organizationId = await resolveOrgId(orgId);
  const invoice = await getInvoice(invoiceId, organizationId);
  const order = await getOrder(invoice.sales_order_id as string, organizationId);
  const customer = await pool.query(
    `SELECT p.legal_name FROM party.customers c
     JOIN party.parties p ON p.id = c.party_id WHERE c.party_id = $1`,
    [order.customer_id],
  );

  const billing = getBillingAdapter();
  const chargeDue =
    dueDate ??
    (order.expected_receipt_date as string | undefined) ??
    new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10);
  const idempotencyKey = `inv-${invoiceId}`;

  const result = await billing.emitCharge({
    invoiceId,
    amount: Number(invoice.total_amount),
    dueDate: chargeDue,
    customerName: customer.rows[0]?.legal_name as string,
    idempotencyKey,
  });

  return withTransaction(async (client) => {
    const charge = await client.query(
      `INSERT INTO billing.charges
         (invoice_id, provider, status, our_number, pix_txid, due_date, amount,
          pdf_object_key, provider_payload, idempotency_key)
       VALUES ($1,'inter','emitida',$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = now()
       RETURNING *`,
      [
        invoiceId,
        result.ourNumber,
        result.pixTxid,
        chargeDue,
        invoice.total_amount,
        result.pdfObjectKey,
        JSON.stringify(result.providerPayload),
        idempotencyKey,
      ],
    );

    await client.query(
      `INSERT INTO finance.receivables
         (organization_id, invoice_id, charge_id, customer_id, description, due_date, amount, amount_open, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,'aberta')`,
      [
        organizationId,
        invoiceId,
        charge.rows[0].id,
        order.customer_id,
        `Fatura ${invoice.number}`,
        chargeDue,
        invoice.total_amount,
      ],
    );

    await client.query(
      `UPDATE billing.invoices SET status = 'faturada', updated_at = now() WHERE id = $1`,
      [invoiceId],
    );
    await client.query(
      `UPDATE commercial.sales_orders SET status = 'faturado', updated_at = now() WHERE id = $1`,
      [invoice.sales_order_id],
    );

    await emitOutboxEvent(client, "charge.emitted", "invoice", invoiceId, {
      ourNumber: result.ourNumber,
    });
    return { charge: charge.rows[0], invoice: await getInvoice(invoiceId, organizationId) };
  });
}
