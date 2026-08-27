import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader, Loading } from '@/components/ui';
import { FiscalCombobox } from '@/components/FiscalCombobox';
import { api, formatCnpj } from '@/lib/api';
import {
  applyCnpjToParceiro,
  deriveIndIeDestClient,
  patchEnderecoFromCep,
  suggestAreaIncentivada,
} from '@/lib/cadastroFill';

type Aptidao = {
  completo?: boolean;
  aptoEmissaoNfe?: boolean;
  aptoReforma?: boolean;
  pendencias?: string[];
  pendenciasEmissao?: string[];
  pendenciasReforma?: string[];
};

type Catalogos = {
  finalidadeParceiro?: { codigo: string; descricao: string }[];
  regimeParceiro?: { codigo: string; descricao: string }[];
  ieStatus?: { codigo: string; descricao: string }[];
  tipoFornecimento?: { codigo: string; descricao: string }[];
  indIEDest?: { codigo: string; descricao: string }[];
};

const emptyEnd = {
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  codigoMunicipio: '',
  municipio: '',
  uf: 'MG',
  cep: '',
};

const emptyForm = {
  apelido: '',
  tipo: 'PJ' as 'PF' | 'PJ' | 'EX',
  cpfCnpj: '',
  razaoSocial: '',
  inscricaoEstadual: '',
  indIEDest: '9' as '1' | '2' | '9',
  email: '',
  emailXml: '',
  telefone: '',
  papelCliente: true,
  papelFornecedor: false,
  papelTransportadora: false,
  finalidade: 'REVENDA' as string,
  consumidorFinal: false,
  regime: '' as string,
  ieStatus: 'NAO_VERIFICADA' as string,
  suframa: '',
  areaIncentivada: false,
  inscricaoMunicipal: '',
  cnae: '',
  tipoFornecimento: '' as string,
  cfopEntradaPadrao: '',
  emiteDocumentoFiscal: true,
  idEstrangeiro: '',
  endereco: { ...emptyEnd },
};

function AptidaoBadges({ aptidao }: { aptidao?: Aptidao }) {
  if (!aptidao) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
        aptidao.aptoEmissaoNfe ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-800 ring-amber-600/20'
      }`}>
        NF-e {aptidao.aptoEmissaoNfe ? 'apto' : 'pendente'}
      </span>
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
        aptidao.aptoReforma ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-600 ring-slate-500/20'
      }`}>
        Reforma {aptidao.aptoReforma ? 'pronta' : 'a completar'}
      </span>
    </div>
  );
}

export function Destinatarios() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consulting, setConsulting] = useState<'cnpj' | 'cep' | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos>({});
  const [filtro, setFiltro] = useState('');

  const load = () =>
    api.listDestinatarios().then((r) => setItems(r as never)).finally(() => setLoading(false));

  useEffect(() => {
    load();
    api.catalogos().then((c) => setCatalogos(c as Catalogos)).catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return items;
    return items.filter((d) => {
      const blob = [d.apelido, d.razaoSocial, d.cpfCnpj, d.finalidade].map(String).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [items, filtro]);

  const setEnd = (key: string, value: string) =>
    setForm((f) => ({
      ...f,
      endereco: { ...f.endereco, [key]: value },
      areaIncentivada: key === 'uf'
        ? suggestAreaIncentivada(value, f.suframa)
        : f.areaIncentivada,
    }));

  const onIeChange = (ie: string) => {
    const ind = deriveIndIeDestClient(ie);
    setForm((f) => ({
      ...f,
      inscricaoEstadual: ie,
      indIEDest: ind,
      ieStatus: ind === '2' ? 'ISENTA' : f.ieStatus === 'ISENTA' && ind !== '2' ? 'NAO_VERIFICADA' : f.ieStatus,
    }));
  };

  const rowToForm = (d: Record<string, unknown>): typeof emptyForm => {
    const end = (d.endereco ?? {}) as Record<string, string>;
    const tipo = (String(d.tipo || 'PJ') as 'PF' | 'PJ' | 'EX');
    return {
      ...emptyForm,
      apelido: String(d.apelido ?? ''),
      tipo,
      cpfCnpj: String(d.cpfCnpj ?? ''),
      razaoSocial: String(d.razaoSocial ?? ''),
      inscricaoEstadual: String(d.inscricaoEstadual ?? ''),
      indIEDest: (String(d.indIEDest ?? '9') as '1' | '2' | '9'),
      email: String(d.email ?? ''),
      emailXml: String(d.emailXml ?? ''),
      telefone: String(d.telefone ?? ''),
      papelCliente: Boolean(d.papelCliente ?? true),
      papelFornecedor: Boolean(d.papelFornecedor),
      papelTransportadora: Boolean(d.papelTransportadora),
      finalidade: String(d.finalidade ?? 'REVENDA'),
      consumidorFinal: Boolean(d.consumidorFinal),
      regime: String(d.regime ?? ''),
      ieStatus: String(d.ieStatus ?? 'NAO_VERIFICADA'),
      suframa: String(d.suframa ?? ''),
      areaIncentivada: Boolean(d.areaIncentivada),
      inscricaoMunicipal: String(d.inscricaoMunicipal ?? ''),
      cnae: String(d.cnae ?? ''),
      tipoFornecimento: String(d.tipoFornecimento ?? ''),
      cfopEntradaPadrao: String(d.cfopEntradaPadrao ?? ''),
      emiteDocumentoFiscal: d.emiteDocumentoFiscal !== false,
      idEstrangeiro: String(d.idEstrangeiro ?? ''),
      endereco: {
        logradouro: String(end.logradouro ?? ''),
        numero: String(end.numero ?? ''),
        complemento: String(end.complemento ?? ''),
        bairro: String(end.bairro ?? ''),
        codigoMunicipio: String(end.codigoMunicipio ?? ''),
        municipio: String(end.municipio ?? ''),
        uf: String(end.uf ?? 'MG'),
        cep: String(end.cep ?? ''),
      },
    };
  };

  const iniciarEdicao = (d: Record<string, unknown>) => {
    setEditingId(String(d.id));
    setForm(rowToForm(d));
    setError(null);
    setHint(`Editando: ${String(d.apelido)} — documento não pode ser alterado.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setEditingId(null);
    setForm(emptyForm);
    setHint(null);
    setError(null);
  };

  const consultarCnpj = async () => {
    setError(null);
    setHint(null);
    setConsulting('cnpj');
    try {
      const data = await api.consultaCnpj(form.cpfCnpj);
      setForm((f) => ({
        ...applyCnpjToParceiro(f, data),
        tipo: 'PJ',
        areaIncentivada: suggestAreaIncentivada(data.uf, f.suframa),
      }));
      setHint(
        `CNPJ ${data.cacheHit ? 'em cache' : 'consultado'} via ${data.fonte}`
        + (data.situacaoCadastral ? ` · Situação: ${data.situacaoCadastral}` : '')
        + ' — revise antes de salvar.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na consulta CNPJ');
    } finally {
      setConsulting(null);
    }
  };

  const consultarCep = async () => {
    setError(null);
    setHint(null);
    setConsulting('cep');
    try {
      const data = await api.consultaCep(form.endereco.cep);
      setForm((f) => {
        const patched = editingId
          ? {
              ...f.endereco,
              cep: data.cep || f.endereco.cep,
              logradouro: data.logradouro || f.endereco.logradouro,
              complemento: data.complemento ?? f.endereco.complemento,
              bairro: data.bairro || f.endereco.bairro,
              municipio: data.municipio || f.endereco.municipio,
              uf: data.uf || f.endereco.uf,
              codigoMunicipio: data.codigoMunicipio || f.endereco.codigoMunicipio,
              numero: f.endereco.numero,
            }
          : patchEnderecoFromCep(f.endereco, data);
        return {
          ...f,
          endereco: patched,
          areaIncentivada: suggestAreaIncentivada(data.uf, f.suframa),
        };
      });
      setHint(`CEP via ${data.fonte}${data.cacheHit ? ' (cache)' : ''} · IBGE ${data.codigoMunicipio || '—'}${editingId ? ' — endereço atualizado' : ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na consulta CEP');
    } finally {
      setConsulting(null);
    }
  };

  const searchCfopEntrada = useCallback((q: string) => api.consultaCfop(q, 'entrada'), []);

  const payloadFromForm = () => ({
    ...form,
    email: form.email || undefined,
    emailXml: form.emailXml || form.email || undefined,
    regime: form.regime || undefined,
    tipoFornecimento: form.tipoFornecimento || undefined,
    cfopEntradaPadrao: form.cfopEntradaPadrao || undefined,
    finalidade: form.papelCliente ? form.finalidade : undefined,
    consumidorFinal: form.finalidade === 'USO_CONSUMO' ? true : form.consumidorFinal,
  });

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = payloadFromForm();
      if (editingId) {
        await api.atualizarDestinatario(editingId, body);
        setHint('Parceiro atualizado.');
      } else {
        await api.criarDestinatario(body);
        setHint(null);
      }
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar parceiro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Parceiros"
        subtitle="Cadastro único dinâmico: consulta CNPJ/CEP (BFF), IE→indIEDest e aptidão fiscal para todas as apurações."
      />

      <form onSubmit={salvar} className={`card mb-6 space-y-6 p-5 ${editingId ? 'ring-2 ring-brand-500/30' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {editingId ? 'Editar parceiro' : 'Novo parceiro'}
          </h2>
          {editingId && (
            <button type="button" className="btn-secondary text-xs" onClick={cancelarEdicao}>
              Cancelar edição
            </button>
          )}
        </div>
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Identificação</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Apelido</label>
              <input className="input" required value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select
                className="input"
                disabled={!!editingId}
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as never })}
              >
                <option value="PJ">PJ</option>
                <option value="PF">PF</option>
                <option value="EX">Estrangeiro</option>
              </select>
            </div>
            <div>
              <label className="label">{form.tipo === 'EX' ? 'idEstrangeiro' : 'CNPJ / CPF'}</label>
              <div className="flex gap-2">
                <input
                  className={`input font-mono ${editingId ? 'bg-slate-50' : ''}`}
                  required={form.tipo !== 'EX'}
                  readOnly={!!editingId}
                  value={form.tipo === 'EX' ? form.idEstrangeiro : form.cpfCnpj}
                  onChange={(e) =>
                    form.tipo === 'EX'
                      ? setForm({ ...form, idEstrangeiro: e.target.value })
                      : setForm({ ...form, cpfCnpj: e.target.value })
                  }
                />
                {form.tipo === 'PJ' && !editingId && (
                  <button type="button" className="btn-secondary shrink-0" disabled={consulting === 'cnpj'} onClick={consultarCnpj}>
                    {consulting === 'cnpj' ? '…' : 'CNPJ'}
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="label">Razão social / Nome</label>
              <input className="input" value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.papelCliente} onChange={(e) => setForm({ ...form, papelCliente: e.target.checked })} />
              Cliente
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.papelFornecedor} onChange={(e) => setForm({ ...form, papelFornecedor: e.target.checked })} />
              Fornecedor
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.papelTransportadora} onChange={(e) => setForm({ ...form, papelTransportadora: e.target.checked })} />
              Transportadora
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.emiteDocumentoFiscal} onChange={(e) => setForm({ ...form, emiteDocumentoFiscal: e.target.checked })} />
              Participa de documento fiscal
            </label>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Fiscal (ICMS · indIEDest · apurações)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Inscrição Estadual</label>
              <input className="input font-mono" placeholder="números ou ISENTO" value={form.inscricaoEstadual} onChange={(e) => onIeChange(e.target.value)} />
              <p className="field-hint">Define indIEDest automaticamente (1 / 2 / 9).</p>
            </div>
            <div>
              <label className="label">indIEDest</label>
              <input
                className="input bg-slate-50"
                readOnly
                value={`${form.indIEDest} — ${(catalogos.indIEDest ?? []).find((o) => o.codigo === form.indIEDest)?.descricao ?? ''}`}
              />
            </div>
            <div>
              <label className="label">Status IE</label>
              <select className="input" value={form.ieStatus} onChange={(e) => setForm({ ...form, ieStatus: e.target.value })}>
                {(catalogos.ieStatus ?? [{ codigo: 'NAO_VERIFICADA', descricao: 'Não verificada' }, { codigo: 'OK', descricao: 'OK' }]).map((o) => (
                  <option key={o.codigo} value={o.codigo}>{o.descricao}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">IM</label>
              <input className="input" value={form.inscricaoMunicipal} onChange={(e) => setForm({ ...form, inscricaoMunicipal: e.target.value })} />
            </div>
            {form.papelCliente && (
              <>
                <div>
                  <label className="label">Finalidade</label>
                  <select
                    className="input"
                    value={form.finalidade}
                    onChange={(e) => setForm({
                      ...form,
                      finalidade: e.target.value,
                      consumidorFinal: e.target.value === 'USO_CONSUMO' ? true : form.consumidorFinal,
                    })}
                  >
                    {(catalogos.finalidadeParceiro ?? [
                      { codigo: 'REVENDA', descricao: 'Revenda' },
                      { codigo: 'INDUSTRIALIZACAO', descricao: 'Industrialização' },
                      { codigo: 'USO_CONSUMO', descricao: 'Uso e consumo' },
                    ]).map((o) => (
                      <option key={o.codigo} value={o.codigo}>{o.descricao}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.consumidorFinal || form.finalidade === 'USO_CONSUMO'} onChange={(e) => setForm({ ...form, consumidorFinal: e.target.checked })} />
                    Consumidor final
                  </label>
                </div>
              </>
            )}
            {form.papelFornecedor && (
              <>
                <div>
                  <label className="label">Regime do fornecedor</label>
                  <select className="input" value={form.regime} onChange={(e) => setForm({ ...form, regime: e.target.value })}>
                    <option value="">—</option>
                    {(catalogos.regimeParceiro ?? []).map((o) => (
                      <option key={o.codigo} value={o.codigo}>{o.descricao}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tipo fornecimento</label>
                  <select className="input" value={form.tipoFornecimento} onChange={(e) => setForm({ ...form, tipoFornecimento: e.target.value })}>
                    <option value="">—</option>
                    {(catalogos.tipoFornecimento ?? []).map((o) => (
                      <option key={o.codigo} value={o.codigo}>{o.descricao}</option>
                    ))}
                  </select>
                </div>
                <FiscalCombobox
                  label="CFOP entrada padrão"
                  value={form.cfopEntradaPadrao}
                  digitsOnly
                  maxLength={4}
                  search={searchCfopEntrada}
                  onChange={(codigo) => setForm({ ...form, cfopEntradaPadrao: codigo })}
                  hint="Catálogo de entrada (1xxx/2xxx)."
                />
              </>
            )}
            <div>
              <label className="label">SUFRAMA</label>
              <input
                className="input"
                value={form.suframa}
                onChange={(e) => setForm({
                  ...form,
                  suframa: e.target.value,
                  areaIncentivada: suggestAreaIncentivada(form.endereco.uf, e.target.value),
                })}
              />
            </div>
            <div>
              <label className="label">CNAE</label>
              <input className="input font-mono" value={form.cnae} onChange={(e) => setForm({ ...form, cnae: e.target.value })} />
            </div>
            <div>
              <label className="label">E-mail XML/DANFE</label>
              <input className="input" type="email" value={form.emailXml} onChange={(e) => setForm({ ...form, emailXml: e.target.value })} />
            </div>
            <div>
              <label className="label">E-mail comercial</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Endereço fiscal (enderDest)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">CEP</label>
              <div className="flex gap-2">
                <input className="input font-mono" required value={form.endereco.cep} onChange={(e) => setEnd('cep', e.target.value)} />
                <button type="button" className="btn-secondary shrink-0" disabled={consulting === 'cep'} onClick={consultarCep}>
                  {consulting === 'cep' ? '…' : 'CEP'}
                </button>
              </div>
              <p className="field-hint">Preenche logradouro, município, UF e IBGE (só campos vazios).</p>
            </div>
            <div className="lg:col-span-2">
              <label className="label">Logradouro</label>
              <input className="input" required value={form.endereco.logradouro} onChange={(e) => setEnd('logradouro', e.target.value)} />
            </div>
            <div>
              <label className="label">Número</label>
              <input className="input" required value={form.endereco.numero} onChange={(e) => setEnd('numero', e.target.value)} />
            </div>
            <div>
              <label className="label">Complemento</label>
              <input className="input" value={form.endereco.complemento} onChange={(e) => setEnd('complemento', e.target.value)} />
            </div>
            <div>
              <label className="label">Bairro</label>
              <input className="input" required value={form.endereco.bairro} onChange={(e) => setEnd('bairro', e.target.value)} />
            </div>
            <div>
              <label className="label">Município</label>
              <input className="input" required value={form.endereco.municipio} onChange={(e) => setEnd('municipio', e.target.value)} />
            </div>
            <div>
              <label className="label">UF</label>
              <input className="input" required maxLength={2} value={form.endereco.uf} onChange={(e) => setEnd('uf', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label">IBGE (7 dígitos)</label>
              <input className="input font-mono" required maxLength={7} value={form.endereco.codigoMunicipio} onChange={(e) => setEnd('codigoMunicipio', e.target.value)} />
              <p className="field-hint">Obrigatório NF-e e IBS territorial.</p>
            </div>
          </div>
        </section>

        {hint && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{hint}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelarEdicao} disabled={saving}>
              Cancelar
            </button>
          )}
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Incluir parceiro'}
          </button>
        </div>
      </form>

      <div className="mb-3 flex items-center gap-3">
        <input className="input max-w-sm" placeholder="Filtrar por nome, documento…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        <span className="text-xs text-slate-400">{filtered.length} registro(s)</span>
      </div>

      {loading ? <Loading /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-2">Apelido</th>
                <th className="px-4 py-2">Documento</th>
                <th className="px-4 py-2">Papéis</th>
                <th className="px-4 py-2">IE / ind</th>
                <th className="px-4 py-2">Aptidão</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((d) => {
                const aptidao = d.aptidao as Aptidao | undefined;
                const id = String(d.id);
                const isEditing = editingId === id;
                const papeis = [
                  d.papelCliente ? 'Cliente' : null,
                  d.papelFornecedor ? 'Fornecedor' : null,
                  d.papelTransportadora ? 'Transp.' : null,
                ].filter(Boolean).join(', ') || '—';
                return (
                  <tr key={id} className={`align-top ${isEditing ? 'bg-brand-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{String(d.apelido)}</div>
                      <div className="text-xs text-slate-500">{String(d.razaoSocial ?? '—')}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{formatCnpj(String(d.cpfCnpj ?? ''))}</td>
                    <td className="px-4 py-3 text-xs">{papeis}</td>
                    <td className="px-4 py-3 text-xs">
                      <div>{String(d.inscricaoEstadual ?? '—')}</div>
                      <div className="text-slate-400">ind {String(d.indIEDest)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <AptidaoBadges aptidao={aptidao} />
                      {aptidao?.pendencias && aptidao.pendencias.length > 0 && (
                        <ul className="mt-1 list-inside list-disc text-xs text-amber-700">
                          {aptidao.pendencias.slice(0, 3).map((p) => <li key={p}>{p}</li>)}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => (isEditing ? cancelarEdicao() : iniciarEdicao(d))}
                      >
                        {isEditing ? 'Cancelar' : 'Editar'}
                      </button>
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
