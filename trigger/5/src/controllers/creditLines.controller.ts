import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { queryCreditLines } from "../services/creditLines.service.js";
import { creditLinesRequestSchema } from "../schemas/creditLines.schema.js";

export async function postCreditLinesController(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const body = creditLinesRequestSchema.parse(request.body);
    const result = await queryCreditLines(body);
    await reply.status(200).send(result);
  } catch (err) {
    if (err instanceof ZodError) {
      await reply.status(400).send({
        error: "ValidationError",
        details: err.flatten(),
      });
      return;
    }
    throw err;
  }
}
