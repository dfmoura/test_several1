export type User = {
  id: string;
  email: string;
  fullName: string;
  roles?: string[];
};

export type DashboardStats = {
  quotesOpen: number;
  ordersOpen: number;
  workOrdersToday: number;
  receivablesDue: number;
  stockCritical: number;
};

export type Customer = {
  id: string;
  partyId?: string;
  document?: string;
  legalName: string;
  tradeName?: string | null;
  email?: string | null;
  phone?: string | null;
  defaultPaymentTerms?: string | null;
  isActive?: boolean;
  createdAt?: string;
};

export type CnpjLookup = {
  cnpj: string;
  legalName: string;
  tradeName?: string;
  email?: string;
  phone?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
};

export type QuoteSpec = {
  measureLabel: string;
  paperWidthCm: number;
  pullCm: number;
  colors: number | string;
  paperName: string;
  finishName: string;
  modelsQty: number;
  columnsQty: number;
  labelsPerRoll: number;
  tubeSize: string;
  dieKind?: string;
  repeatZ?: number;
  rewindColumns?: number;
  machineCostGroup: string;
  rpm: number;
  changeoverMode: string;
  taxPercent: number;
  commissionPercent: number;
  usesMatrix: boolean;
  firstOrderMatrix: boolean;
};

export type QuoteTier = {
  quantity: number;
  labelPrice: number;
  matrixPrice: number;
  totalPrice: number;
  linearMeters?: number;
  areaM2?: number;
  breakdown?: Record<string, unknown>;
};

export type Quote = {
  id: string;
  number?: string;
  customerId: string;
  customerName?: string;
  status: string;
  validUntil?: string;
  taxPercent?: number;
  commissionPercent?: number;
  spec?: QuoteSpec;
  quantities?: number[];
  tiers?: QuoteTier[];
  selectedQuantity?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SalesOrder = {
  id: string;
  number?: string;
  quoteId?: string;
  customerId: string;
  customerName?: string;
  status: string;
  totalCents?: number;
  paymentTerms?: string;
  createdAt?: string;
  lines?: SalesOrderLine[];
};

export type SalesOrderLine = {
  id: string;
  description?: string;
  quantity: number;
  unitPriceCents?: number;
  totalCents?: number;
};

export type WorkOrder = {
  id: string;
  number?: string;
  orderId?: string;
  orderNumber?: string;
  status: string;
  machineName?: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
};

export type StockBalance = {
  id?: string;
  itemId: string;
  sku?: string;
  name?: string;
  itemName?: string;
  warehouseCode?: string;
  warehouseName?: string;
  quantity?: number;
  qtyOnHand?: number | string;
  qtyReserved?: number | string;
  qtyAvailable?: number | string;
  uomCode?: string;
  reorderPoint?: number;
  isCritical?: boolean;
};

export type StockMovement = {
  id: string;
  name?: string;
  itemName?: string;
  movementType?: string;
  quantity?: number | string;
  qty?: number | string;
  reference?: string;
  refType?: string;
  createdAt?: string;
  movedAt?: string;
};

export type PurchaseOrder = {
  id: string;
  number?: string;
  supplierName?: string;
  status: string;
  totalCents?: number;
  expectedAt?: string;
  createdAt?: string;
};

export type Invoice = {
  id: string;
  number?: string;
  orderId?: string;
  salesOrderId?: string;
  orderNumber?: string;
  customerName?: string;
  status: string;
  totalAmount?: number | string;
  totalCents?: number;
  fiscalStatus?: string | null;
  chargeStatus?: string | null;
  createdAt?: string;
};

export type BillableOrder = {
  id: string;
  number?: string;
  status: string;
  customerName?: string;
  totalAmount?: number | string;
  paymentTerms?: string;
  woTotal?: number | string;
  woDone?: number | string;
  ready?: boolean;
};

export type Shipment = {
  id: string;
  number?: string;
  orderNumber?: string;
  customerName?: string;
  status: string;
  carrier?: string;
  trackingCode?: string;
  shippedAt?: string;
  deliveredAt?: string;
};

export type Receivable = {
  id: string;
  number?: string;
  customerName?: string;
  dueDate: string;
  amountCents: number;
  balanceCents: number;
  status: string;
};

export type Payable = {
  id: string;
  number?: string;
  supplierName?: string;
  dueDate: string;
  amountCents: number;
  balanceCents: number;
  status: string;
};

export type Paginated<T> = {
  data: T[];
  total?: number;
};

export type ApiError = {
  message: string;
  code?: string;
  details?: unknown;
};
