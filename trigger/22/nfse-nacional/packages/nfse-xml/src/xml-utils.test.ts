import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDataCompetenciaBr, formatDhEmiBr } from './xml-utils.js';

describe('formatDataCompetenciaBr', () => {
  it('usa a mesma data civil de Brasília que dhEmi', () => {
    const date = new Date('2026-07-07T00:30:00.000Z');
    const dhEmi = formatDhEmiBr(date);
    const dCompet = formatDataCompetenciaBr(date);
    assert.equal(dhEmi.slice(0, 10), dCompet);
    assert.equal(dCompet, '2026-07-06');
  });

  it('não usa data UTC quando já é o dia seguinte em UTC', () => {
    const date = new Date('2026-07-07T02:00:00.000Z');
    assert.equal(formatDataCompetenciaBr(date), '2026-07-06');
    assert.notEqual(date.toISOString().slice(0, 10), formatDataCompetenciaBr(date));
  });
});
