import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventoBuilder } from './builders.js';
import { pedRegInfId } from './xml-utils.js';

describe('EventoBuilder', () => {
  const chave = '31702062253369941000163000000000000926076272894013';

  it('gera pedRegEvento com elemento raiz e Id conforme padrão nacional', () => {
    const xml = new EventoBuilder().buildCancelamento({
      chaveAcesso: chave,
      codigoMotivo: '1',
      motivo: 'Cancelamento por erro na emissao',
      cnpj: '53369941000163',
      tpAmb: '1',
    });

    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">'));
    assert.ok(!xml.includes('<PedRegEvento'));

    const id = pedRegInfId(chave);
    assert.equal(id.length, 59);
    assert.equal(id, `PRE${chave}101101`);
    assert.ok(xml.includes(`<infPedReg Id="${id}">`));
    assert.ok(xml.includes('<e101101>'));
    assert.ok(xml.endsWith('</pedRegEvento>'));
  });
});
