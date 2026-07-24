import { getToken } from "./auth";
import { asDataList, toCamel } from "./case";
import type { ApiError } from "./types";

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost/api";

export class ApiRequestError extends Error {
  status: number;
  body: ApiError | unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
};

function buildUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

function errorMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null) {
    const p = payload as Record<string, unknown>;
    if (typeof p.error === "string") return p.error;
    if (typeof p.message === "string") return p.message;
  }
  return `Erro ${status}`;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(response.status, errorMessage(payload, response.status), payload);
  }

  return toCamel<T>(payload);
}

export const apiClient = {
  login: (email: string, password: string) =>
    api<{ token: string; user: unknown }>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),

  dashboard: () => api<import("./types").DashboardStats>("/dashboard"),

  customers: {
    list: async () => asDataList<import("./types").Customer>(await api("/customers")),
    get: (id: string) => api<import("./types").Customer>(`/customers/${id}`),
    create: (data: Partial<import("./types").Customer> & { legalName: string }) =>
      api<import("./types").Customer>("/customers", { method: "POST", body: data }),
    lookupCnpj: (cnpj: string) =>
      api<import("./types").CnpjLookup>(`/customers/lookup/cnpj/${cnpj.replace(/\D/g, "")}`),
  },

  pricing: {
    calculate: async (spec: import("./types").QuoteSpec, quantities: number[]) => {
      const res = await api<{ tiers?: import("./types").QuoteTier[] } | import("./types").QuoteTier[]>(
        "/pricing/calculate",
        { method: "POST", body: { spec, quantities } },
      );
      const tiers = Array.isArray(res) ? res : (res.tiers ?? []);
      return { tiers };
    },
  },

  quotes: {
    list: async () => asDataList<import("./types").Quote>(await api("/quotes")),
    get: async (id: string) => {
      const q = await api<Record<string, unknown>>(`/quotes/${id}`);
      const snap = (q.snapshot ?? {}) as { approvedQuantity?: number };
      return {
        ...q,
        customerId: (q.customerId ?? q.customer_id) as string,
        selectedQuantity: snap.approvedQuantity ?? null,
        tiers: (q.tiers as import("./types").QuoteTier[]) ?? [],
      } as import("./types").Quote;
    },
    create: (data: {
      customerId: string;
      spec: import("./types").QuoteSpec;
      quantities: number[];
      notes?: string;
    }) => api<import("./types").Quote>("/quotes", { method: "POST", body: data }),
    updateStatus: async (id: string, status: string, selectedQuantity?: number) => {
      if (status === "aprovado" || status === "aprovar") {
        return api<import("./types").Quote>(`/quotes/${id}/approve`, {
          method: "POST",
          body: { selectedQuantity: selectedQuantity ?? 10000 },
        });
      }
      const mapped =
        status === "enviar" || status === "enviado"
          ? "enviado"
          : status === "reprovar" || status === "reprovado"
            ? "reprovado"
            : status;
      return api<import("./types").Quote>(`/quotes/${id}/status`, {
        method: "PATCH",
        body: { status: mapped },
      });
    },
  },

  orders: {
    list: async () => asDataList<import("./types").SalesOrder>(await api("/orders")),
    get: (id: string) => api<import("./types").SalesOrder>(`/orders/${id}`),
    fromQuote: (quoteId: string, selectedQuantity?: number) =>
      api<import("./types").SalesOrder>("/orders", {
        method: "POST",
        body: {
          quoteId,
          selectedQuantity,
          paymentTerms: "28",
        },
      }),
    updateStatus: (id: string, status: string) =>
      api<import("./types").SalesOrder>(`/orders/${id}/status`, {
        method: "PATCH",
        body: { status },
      }),
  },

  workOrders: {
    list: async () => asDataList<import("./types").WorkOrder>(await api("/work-orders")),
    liberar: (id: string) =>
      api<import("./types").WorkOrder>(`/work-orders/${id}/liberar`, { method: "POST" }),
    iniciar: (id: string) =>
      api<import("./types").WorkOrder>(`/work-orders/${id}/iniciar`, { method: "POST" }),
    concluir: (id: string) =>
      api<import("./types").WorkOrder>(`/work-orders/${id}/concluir`, { method: "POST" }),
  },

  inventory: {
    balances: async () => {
      const list = asDataList<Record<string, unknown>>(await api("/inventory/balances"));
      return {
        data: list.data.map((row) => {
          const qtyAvailable = Number(row.qtyAvailable ?? row.qtyOnHand ?? 0);
          const qtyReserved = Number(row.qtyReserved ?? 0);
          return {
            id: String(row.itemId ?? ""),
            itemId: String(row.itemId ?? ""),
            sku: row.sku as string | undefined,
            name: row.name as string | undefined,
            itemName: String(row.itemName ?? row.name ?? "—"),
            warehouseCode: row.warehouseCode as string | undefined,
            warehouseName: row.warehouseName as string | undefined,
            quantity: qtyAvailable,
            qtyOnHand: row.qtyOnHand as number | string | undefined,
            qtyReserved,
            qtyAvailable,
            uomCode: row.uomCode as string | undefined,
            isCritical: qtyAvailable <= 0,
          } satisfies import("./types").StockBalance;
        }),
      };
    },
    movements: async () => {
      const list = asDataList<Record<string, unknown>>(await api("/inventory/movements"));
      return {
        data: list.data.map((row) => ({
          id: String(row.id ?? ""),
          name: row.name as string | undefined,
          itemName: String(row.itemName ?? row.name ?? "—"),
          movementType: String(row.movementType ?? ""),
          quantity: Number(row.quantity ?? row.qty ?? 0),
          reference: (row.reference ?? row.refType) as string | undefined,
          createdAt: String(row.createdAt ?? row.movedAt ?? ""),
          movedAt: row.movedAt as string | undefined,
        })),
      };
    },
  },

  purchasing: {
    list: async () =>
      asDataList<import("./types").PurchaseOrder>(await api("/purchasing/orders")),
    create: (data: {
      supplierId: string;
      lines: { itemId: string; qtyOrdered: number; unitPrice: number }[];
    }) =>
      api<import("./types").PurchaseOrder>("/purchasing/orders", { method: "POST", body: data }),
    receive: (orderId: string) =>
      api<{ ok: boolean }>(`/purchasing/orders/${orderId}/receive`, { method: "POST" }),
  },

  billing: {
    list: async () => asDataList<import("./types").Invoice>(await api("/billing/invoices")),
    billableOrders: async () =>
      asDataList<import("./types").BillableOrder>(await api("/billing/billable-orders")),
    createFromOrder: (orderId: string, managerOverride = true) =>
      api<import("./types").Invoice>("/billing/invoices", {
        method: "POST",
        body: { salesOrderId: orderId, orderId, managerOverride },
      }),
    emitNfe: (invoiceId: string) =>
      api<import("./types").Invoice>(`/billing/invoices/${invoiceId}/nfe`, { method: "POST" }),
    emitCharge: (invoiceId: string) =>
      api<import("./types").Invoice>(`/billing/invoices/${invoiceId}/charge`, { method: "POST" }),
  },

  shipments: {
    list: async () => asDataList<import("./types").Shipment>(await api("/shipments")),
    create: (orderId: string) =>
      api<import("./types").Shipment>("/shipments", {
        method: "POST",
        body: { salesOrderId: orderId, orderId },
      }),
    advance: (id: string, status: string) =>
      api<import("./types").Shipment>(`/shipments/${id}/status`, {
        method: "PATCH",
        body: { status },
      }),
    confirm: (id: string) =>
      api<import("./types").Shipment>(`/shipments/${id}/confirm`, { method: "POST" }),
  },

  finance: {
    receivables: async () =>
      asDataList<import("./types").Receivable>(await api("/finance/receivables")),
    payables: async () => asDataList<import("./types").Payable>(await api("/finance/payables")),
    allocate: (data: {
      receivableId?: string;
      payableId?: string;
      amountCents?: number;
      amount?: number;
      notes?: string;
    }) => {
      const amount =
        data.amount ??
        (data.amountCents != null ? Number(data.amountCents) / 100 : undefined);
      return api<{ ok: boolean }>("/finance/allocate", {
        method: "POST",
        body: {
          direction: data.receivableId ? "in" : "out",
          receivableId: data.receivableId,
          payableId: data.payableId,
          amount,
          notes: data.notes,
          method: "manual",
        },
      });
    },
  },
};

export { API_BASE };
