import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildReturnState,
  parseNavReturn,
  resolveVoltar,
} from '../src/lib/navReturn.ts';

describe('navReturn', () => {
  it('buildReturnState monta provenance com label', () => {
    const st = buildReturnState('/pedidos/12', 'Voltar ao pedido PED-1');
    assert.equal(st.returnTo, '/pedidos/12');
    assert.equal(st.returnLabel, 'Voltar ao pedido PED-1');
  });

  it('resolveVoltar usa provenance válida', () => {
    const st = buildReturnState('/pedidos/12', 'Voltar ao pedido PED-1');
    const r = resolveVoltar('/ordens-producao', st);
    assert.equal(r.to, '/pedidos/12');
    assert.equal(r.label, 'Voltar ao pedido PED-1');
  });

  it('resolveVoltar cai no fallback sem state (deep link / F5)', () => {
    const r = resolveVoltar('/ordens-producao', null);
    assert.equal(r.to, '/ordens-producao');
    assert.equal(r.label, 'Voltar');
  });

  it('resolveVoltar usa fallbackLabel quando provenance não traz label', () => {
    const r = resolveVoltar('/compras/ordens', { returnTo: '/compras/nfe-destinadas' }, 'Voltar');
    assert.equal(r.to, '/compras/nfe-destinadas');
    assert.equal(r.label, 'Voltar');
  });

  it('rejeita URL externa e protocol-relative', () => {
    assert.equal(parseNavReturn({ returnTo: 'https://evil.com' }), null);
    assert.equal(parseNavReturn({ returnTo: '//evil.com/x' }), null);
    assert.equal(parseNavReturn({ returnTo: 'javascript:alert(1)' }), null);
  });

  it('rejeita prefixo fora da allowlist', () => {
    assert.equal(parseNavReturn({ returnTo: '/admin/secret' }), null);
    assert.equal(parseNavReturn({ returnTo: '/login' }), null);
  });

  it('aceita casa canônica com query', () => {
    const parsed = parseNavReturn({ returnTo: '/orcamentos?status=CANCELADO' });
    assert.ok(parsed);
    assert.equal(parsed.returnTo, '/orcamentos?status=CANCELADO');
  });

  it('aceita NF-e vinculadas e detalhe', () => {
    assert.equal(
      parseNavReturn({ returnTo: '/compras/nfe-recebidas' })?.returnTo,
      '/compras/nfe-recebidas',
    );
    assert.equal(
      parseNavReturn({ returnTo: '/compras/nfe-recebidas/9' })?.returnTo,
      '/compras/nfe-recebidas/9',
    );
  });
});
