import type { FastifyInstance } from "fastify";
import { postCreditLinesController } from "../controllers/creditLines.controller.js";

export async function registerCreditLinesRoutes(app: FastifyInstance): Promise<void> {
  app.post("/credit-lines", postCreditLinesController);
}
