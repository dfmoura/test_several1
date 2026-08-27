import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader, Loading } from '@/components/ui';
import { FiscalCombobox, formatCest, formatNcm } from '@/components/FiscalCombobox';
import { api } from '@/lib/api';

type Aptidao = {
  completo?: boolean;
  aptoEmissaoNfe?: boolean;
  aptoReforma?: boolean;
  pendencias?: string[];
  pendenciasEmissao?: string[];
  pendenciasReforma?: string[];
};

const emptyForm = {
  codigo: '',
  descricao: '',
  descricaoFiscal: '',
  ncm: '',
  cfop: '5102',
  cfopEntradaPadrao: '',
  unidade: 'UN',
  valorUnitario: '0',
  origem: '0',
  csosn: '102',
  cst: '',
  cest: '',
  gtin: '',
  tipoItemSped: '00',
  cstPis: '49',
  cstCofins: '49',
  aliquotaPis: '',
  aliquotaCofins: '',
  cclassTrib: '010001',
  cstIbsCbs: '010',
  aliquotaIbs: '',
  aliquotaCbs: '',
  sujeitoIs: false,
  cstIs: '',
  cclassTribIs: '',
  aliquotaIs: '',
  cbenef: '',
};

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
      ok ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-800 ring-amber-600/20'
    }`}>
      {label}
    </span>
  );
}

export function Produtos() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filtro, setFiltro] = useState('');

  const load = () =>
    api.listProdutos().then((r) => setItems(r as never)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => {
      const blob = [p.codigo, p.descricao, p.ncm, p.cfop, p.cclassTrib].map(String).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [items, filtro]);

  const searchNcm = useCallback((q: string) => api.consultaNcm(q), []);
  const searchCest = useCallback((q: string) => api.consultaCest(q, form.ncm || undefined), [form.ncm]);
  const searchCfopSaida = useCallback((q: string) => api.consultaCfop(q, 'saida'), []);
  const searchCfopEntrada = useCallback((q: string) => api.consultaCfop(q, 'entrada'), []);
  const searchCsosn = useCallback((q: string) => api.consultaCsosn(q), []);
  const searchCst = useCallback((q: string) => api.consultaCstIcms(q), []);
  const searchPis = useCallback((q: string) => api.consultaCstPisCofins(q), []);
  const searchOrigem = useCallback((q: string) => api.consultaOrigem(q), []);
  const searchSped = useCallback((q: string) => api.consultaTipoItemSped(q), []);
  const searchCclass = useCallback((q: string) => api.consultaCclassTrib(q), []);
  const searchCstIbs = useCallback((q: string) => api.consultaCstIbsCbs(q), []);
  const searchCstIs = useCallback((q: string) => api.consultaCstIs(q), []);

  const onCclassChange = (codigo: string) => {
    const digits = codigo.replace(/\D/g, '').slice(0, 6);
    const cst = digits.length >= 3 ? digits.slice(0, 3) : form.cstIbsCbs;
    setForm((f) => ({ ...f, cclassTrib: digits, cstIbsCbs: cst }));
  };

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.criarProduto({
        ...form,
        valorUnitario: Number(form.valorUnitario || 0),
        aliquotaPis: form.aliquotaPis !== '' ? Number(form.aliquotaPis) : undefined,
        aliquotaCofins: form.aliquotaCofins !== '' ? Number(form.aliquotaCofins) : undefined,
        aliquotaIbs: form.aliquotaIbs !== '' ? Number(form.aliquotaIbs) : undefined,
        aliquotaCbs: form.aliquotaCbs !== '' ? Number(form.aliquotaCbs) : undefined,
        aliquotaIs: form.aliquotaIs !== '' ? Number(form.aliquotaIs) : undefined,
        cfopEntradaPadrao: form.cfopEntradaPadrao || undefined,
        cst: form.cst || undefined,
        cest: form.cest || undefined,
        gtin: form.gtin || undefined,
        cstIs: form.sujeitoIs ? form.cstIs || undefined : undefined,
        cclassTribIs: form.sujeitoIs ? form.cclassTribIs || undefined : undefined,
        cbenef: form.cbenef || undefined,
        descricaoFiscal: form.descricaoFiscal || form.descricao,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Produtos"
        subtitle="Catálogos pesquisáveis (NCM/CEST/CFOP/CST/cClassTrib) + reforma IBS/CBS/IS. Consulta sob demanda via BFF."
      />

      <form onSubmit={criar} className="card mb-6 space-y-6 p-5">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Identificação</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Código</label>
              <input className="input font-mono" required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div className="lg:col-span-2">
              <label className="label">Descrição</label>
              <input className="input" required value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div>
              <label className="label">Unidade</label>
              <input className="input" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} />
            </div>
            <div className="lg:col-span-2">
              <label className="label">Descrição fiscal (NF)</label>
              <input className="input" value={form.descricaoFiscal} placeholder="Se vazio, usa a descrição" onChange={(e) => setForm({ ...form, descricaoFiscal: e.target.value })} />
            </div>
            <div>
              <label className="label">Valor unitário</label>
              <input className="input" type="number" step="0.0001" min="0" value={form.valorUnitario} onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })} />
            </div>
            <div>
              <label className="label">GTIN</label>
              <input className="input font-mono" value={form.gtin} placeholder="vazio = SEM GTIN" onChange={(e) => setForm({ ...form, gtin: e.target.value })} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Classificação (NCM · CFOP · origem · SPED)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FiscalCombobox
              label="NCM"
              value={form.ncm}
              digitsOnly
              maxLength={8}
              formatCodigo={formatNcm}
              search={searchNcm}
              onChange={(codigo) => setForm({ ...form, ncm: codigo, cest: '' })}
              hint="Catálogo local + BrasilAPI sob demanda. Trocar NCM limpa CEST."
            />
            <FiscalCombobox
              label="CEST"
              value={form.cest}
              digitsOnly
              maxLength={7}
              formatCodigo={formatCest}
              search={searchCest}
              onChange={(codigo) => setForm({ ...form, cest: codigo })}
              hint="Filtrado pelo NCM quando houver vínculo ST."
            />
            <FiscalCombobox
              label="CFOP saída"
              value={form.cfop}
              digitsOnly
              maxLength={4}
              search={searchCfopSaida}
              onChange={(codigo) => setForm({ ...form, cfop: codigo })}
            />
            <FiscalCombobox
              label="CFOP entrada"
              value={form.cfopEntradaPadrao}
              digitsOnly
              maxLength={4}
              search={searchCfopEntrada}
              onChange={(codigo) => setForm({ ...form, cfopEntradaPadrao: codigo })}
            />
            <FiscalCombobox
              label="Origem"
              value={form.origem}
              digitsOnly
              maxLength={1}
              search={searchOrigem}
              onChange={(codigo) => setForm({ ...form, origem: codigo })}
            />
            <FiscalCombobox
              label="Tipo item SPED"
              value={form.tipoItemSped}
              digitsOnly
              maxLength={2}
              search={searchSped}
              onChange={(codigo) => setForm({ ...form, tipoItemSped: codigo })}
            />
            <div>
              <label className="label">cBenef</label>
              <input className="input font-mono" value={form.cbenef} onChange={(e) => setForm({ ...form, cbenef: e.target.value })} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">ICMS atual (Simples / regime normal)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FiscalCombobox label="CSOSN (Simples)" value={form.csosn} digitsOnly maxLength={3} search={searchCsosn} onChange={(c) => setForm({ ...form, csosn: c })} />
            <FiscalCombobox label="CST ICMS (normal)" value={form.cst} digitsOnly maxLength={3} search={searchCst} onChange={(c) => setForm({ ...form, cst: c })} />
            <FiscalCombobox label="CST PIS" value={form.cstPis} digitsOnly maxLength={2} search={searchPis} onChange={(c) => setForm({ ...form, cstPis: c })} />
            <FiscalCombobox label="CST COFINS" value={form.cstCofins} digitsOnly maxLength={2} search={searchPis} onChange={(c) => setForm({ ...form, cstCofins: c })} />
            <div>
              <label className="label">Alíquota PIS %</label>
              <input className="input" type="number" step="0.0001" value={form.aliquotaPis} onChange={(e) => setForm({ ...form, aliquotaPis: e.target.value })} />
            </div>
            <div>
              <label className="label">Alíquota COFINS %</label>
              <input className="input" type="number" step="0.0001" value={form.aliquotaCofins} onChange={(e) => setForm({ ...form, aliquotaCofins: e.target.value })} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Reforma — IBS / CBS / IS (LC 214 · IT 2025.002)</h2>
          <p className="mb-3 text-xs text-slate-500">
            Parametrize agora. A emissão XML do grupo reforma só entra quando o layout SEFAZ exigir — PL_009 atual preservado.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FiscalCombobox
              label="cClassTrib"
              value={form.cclassTrib}
              digitsOnly
              maxLength={6}
              search={searchCclass}
              onChange={onCclassChange}
              hint="3 primeiros dígitos = CST IBS/CBS."
            />
            <FiscalCombobox
              label="CST IBS/CBS"
              value={form.cstIbsCbs}
              digitsOnly
              maxLength={3}
              search={searchCstIbs}
              onChange={(c) => setForm({ ...form, cstIbsCbs: c })}
            />
            <div>
              <label className="label">Alíquota IBS %</label>
              <input className="input" type="number" step="0.0001" value={form.aliquotaIbs} onChange={(e) => setForm({ ...form, aliquotaIbs: e.target.value })} />
            </div>
            <div>
              <label className="label">Alíquota CBS %</label>
              <input className="input" type="number" step="0.0001" value={form.aliquotaCbs} onChange={(e) => setForm({ ...form, aliquotaCbs: e.target.value })} />
            </div>
            <div className="flex items-end pb-2 lg:col-span-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.sujeitoIs} onChange={(e) => setForm({ ...form, sujeitoIs: e.target.checked })} />
                Sujeito a Imposto Seletivo (IS)
              </label>
            </div>
            {form.sujeitoIs && (
              <>
                <FiscalCombobox label="CST IS" value={form.cstIs} digitsOnly maxLength={3} search={searchCstIs} onChange={(c) => setForm({ ...form, cstIs: c })} />
                <div>
                  <label className="label">cClassTrib IS</label>
                  <input className="input font-mono" maxLength={6} value={form.cclassTribIs} onChange={(e) => setForm({ ...form, cclassTribIs: e.target.value })} />
                </div>
                <div>
                  <label className="label">Alíquota IS %</label>
                  <input className="input" type="number" step="0.0001" value={form.aliquotaIs} onChange={(e) => setForm({ ...form, aliquotaIs: e.target.value })} />
                </div>
              </>
            )}
          </div>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Incluir produto'}</button>
        </div>
      </form>

      <div className="mb-3 flex items-center gap-3">
        <input className="input max-w-sm" placeholder="Filtrar por código, NCM, cClassTrib…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        <span className="text-xs text-slate-400">{filtered.length} registro(s)</span>
      </div>

      {loading ? <Loading /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Descrição</th>
                <th className="px-4 py-2">NCM / CFOP</th>
                <th className="px-4 py-2">ICMS</th>
                <th className="px-4 py-2">IBS/CBS</th>
                <th className="px-4 py-2">Aptidão</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => {
                const aptidao = p.aptidao as Aptidao | undefined;
                return (
                  <tr key={String(p.id)} className="align-top">
                    <td className="px-4 py-3 font-mono text-xs">{String(p.codigo)}</td>
                    <td className="px-4 py-3">
                      <div>{String(p.descricao)}</div>
                      {p.sujeitoIs ? <span className="mt-1 inline-block text-[11px] text-orange-700">IS</span> : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <div>{formatNcm(String(p.ncm))}</div>
                      <div className="text-slate-400">{String(p.cfop)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.csosn ? `CSOSN ${String(p.csosn)}` : p.cst ? `CST ${String(p.cst)}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <div>{String(p.cclassTrib ?? '—')}</div>
                      <div className="text-slate-400">CST {String(p.cstIbsCbs ?? '—')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Pill ok={!!aptidao?.aptoEmissaoNfe} label={aptidao?.aptoEmissaoNfe ? 'NF-e apto' : 'NF-e pendente'} />
                        <Pill ok={!!aptidao?.aptoReforma} label={aptidao?.aptoReforma ? 'Reforma pronta' : 'Reforma a completar'} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
