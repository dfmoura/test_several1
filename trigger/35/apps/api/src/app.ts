import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { authPlugin } from './infrastructure/http/auth-plugin.js';
import { registerAuthRoutes } from './modules/plataforma/auth/auth.routes.js';
import { registerPlataformaRoutes } from './modules/plataforma/plataforma.routes.js';
import { registerCadastrosRoutes } from './modules/cadastros/cadastros.routes.js';
import { registerComercialRoutes } from './modules/comercial/comercial.routes.js';
import { registerEstoqueRoutes } from './modules/estoque/estoque.routes.js';
import { registerProducaoRoutes } from './modules/producao/producao.routes.js';
import { registerFiscalRoutes } from './modules/fiscal/fiscal.routes.js';
import { registerFinanceiroRoutes } from './modules/financeiro/financeiro.routes.js';
import { registerWhatsAppRoutes } from './modules/integracoes/whatsapp/whatsapp.routes.js';
import { registerIntegracoesRoutes } from './modules/integracoes/integracoes.routes.js';
import { registerGerencialRoutes } from './modules/gerencial/gerencial.routes.js';
import { registerComprasRoutes } from './modules/compras/compras.routes.js';
import { AppError } from './modules/shared/errors/app-error.js';
import { money, qty } from './modules/shared/decimal/money.js';
import { getFocusAdapter } from './modules/fiscal/focus/focus.factory.js';
import { getBankProvider } from './modules/financeiro/bank/bank.factory.js';
import { getWhatsAppAdapter } from './modules/integracoes/whatsapp/whatsapp.factory.js';
import { prisma } from './infrastructure/prisma/client.js';
import { getKillSwitchStatus } from './modules/integracoes/kill-switch.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: ['req.headers.authorization', 'body.senha'],
    },
    genReqId: (req) => {
      const h = req.headers['x-correlation-id'];
      return typeof h === 'string' && h ? h : cryptoRandomId();
    },
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'ERP RLP API',
        description: 'Monólito modular — Fase 2 Should (M07 Compras)',
        version: '1.1.0-m07',
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/documentation' });

  await app.register(authPlugin);

  app.get('/api/v1/health', {
    schema: { tags: ['Ops'], summary: 'Healthcheck' },
    handler: async (request) => {
      const empresaIdHeader = request.headers['x-empresa-id'];
      let switches = { focus: true, bank: true, whatsapp: true };
      if (typeof empresaIdHeader === 'string' && empresaIdHeader) {
        try {
          switches = await getKillSwitchStatus(BigInt(empresaIdHeader));
        } catch {
          // ignore invalid header in health
        }
      } else {
        const emp = await prisma.empresa.findFirst({ where: { codigo: 'EMP-00001' } });
        if (emp) switches = await getKillSwitchStatus(emp.id);
      }
      const focusName = getFocusAdapter().name;
      const bankName = getBankProvider().name;
      const waName = getWhatsAppAdapter().name;
      return {
        status: 'ok',
        service: 'erp-rlp-api',
        fase: '2-m07',
        time: new Date().toISOString(),
        adapters: {
          focus: switches.focus ? focusName : 'disabled',
          bank: switches.bank ? bankName : 'disabled',
          whatsapp: switches.whatsapp ? waName : 'disabled',
        },
        decimalSmoke: {
          money: money('10.005').toFixed(2),
          qty: qty('1.23456').toFixed(4),
        },
      };
    },
  });

  await registerAuthRoutes(app);
  await registerPlataformaRoutes(app);
  await registerCadastrosRoutes(app);
  await registerComercialRoutes(app);
  await registerEstoqueRoutes(app);
  await registerProducaoRoutes(app);
  await registerFiscalRoutes(app);
  await registerFinanceiroRoutes(app);
  await registerWhatsAppRoutes(app);
  await registerIntegracoesRoutes(app);
  await registerGerencialRoutes(app);
  await registerComprasRoutes(app);

  app.setErrorHandler((err, request, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    request.log.error({ err }, 'error_handler');
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno' },
    });
  });

  return app;
}

function cryptoRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
