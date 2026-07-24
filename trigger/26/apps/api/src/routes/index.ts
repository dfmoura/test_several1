import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.routes.js";
import { billingRoutes } from "./billing.routes.js";
import { catalogRoutes } from "./catalog.routes.js";
import { customerRoutes } from "./customers.routes.js";
import { dashboardRoutes } from "./dashboard.routes.js";
import { financeRoutes } from "./finance.routes.js";
import { healthRoutes } from "./health.routes.js";
import { inventoryRoutes } from "./inventory.routes.js";
import { orderRoutes } from "./orders.routes.js";
import { pricingRoutes } from "./pricing.routes.js";
import { purchasingRoutes } from "./purchasing.routes.js";
import { quoteRoutes } from "./quotes.routes.js";
import { shipmentRoutes } from "./shipments.routes.js";
import { supplierRoutes } from "./suppliers.routes.js";
import { webhookRoutes } from "./webhooks.routes.js";
import { workOrderRoutes } from "./work-orders.routes.js";

export async function registerRoutes(app: FastifyInstance) {
  await healthRoutes(app);
  await authRoutes(app);
  await webhookRoutes(app);
  await dashboardRoutes(app);
  await customerRoutes(app);
  await supplierRoutes(app);
  await catalogRoutes(app);
  await pricingRoutes(app);
  await quoteRoutes(app);
  await orderRoutes(app);
  await workOrderRoutes(app);
  await inventoryRoutes(app);
  await purchasingRoutes(app);
  await billingRoutes(app);
  await shipmentRoutes(app);
  await financeRoutes(app);
}
