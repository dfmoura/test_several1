import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui';
import { api } from '@/lib/api';

type Endereco = {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  municipio: string;
  uf: string;
  cep: string;
};

const emptyEnd: Endereco = {
  logradouro: '', numero: '', bairro: '', codigoMunicipio: '', municipio: '', uf: 'MG', cep: '',
};

export function Emitir() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<Array<Record<string, unknown>>>([]);
  const [dests, setDests] = useState<Array<Record<string, unknown>>>([]);
  const [endereco, setEndereco] = useState<Endereco>(emptyEnd);
  const [form, setForm] = useState({
    naturezaOperacao: 'VENDA DE MERCADORIA',
    destTipo: 'PJ' as 'PF' | 'PJ' | 'EX',
    destCnpj: '',
    destNome: '',
    destIe: '',
    indIEDest: '9',
    email: '',
    codigo: '',
    descricao: '',
    ncm: '',
    cfop: '5102',
    unidade: 'UN',
    quantidade: '1',
    valorUnitario: '0',
    origem: '0',
    csosn: '102',
    cst: '',
    cest: '',
  });

  useEffect(() => {
    Promise.all([api.listProdutos(), api.listDestinatarios()]).then(([p, d]) => {
      setProdutos(p as never);
      setDests(d as never);
    }).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!endereco.logradouro || !endereco.codigoMunicipio) {
        throw new Error('Selecione um parceiro com endereço fiscal completo (IBGE).');
      }
      const result = await api.emitir({
        naturezaOperacao: form.naturezaOperacao,
        destinatario: {
          tipo: form.destTipo === 'EX' ? 'PJ' : form.destTipo,
          cpfCnpj: form.destCnpj,
          razaoSocial: form.destNome,
          inscricaoEstadual: form.destIe || undefined,
          indIEDest: form.indIEDest,
          email: form.email || undefined,
          endereco,
        },
        itens: [{
          codigo: form.codigo,
          descricao: form.descricao,
          ncm: form.ncm,
          cfop: form.cfop,
          unidade: form.unidade,
          quantidade: Number(form.quantidade),
          valorUnitario: Number(form.valorUnitario),
          origem: form.origem || undefined,
          csosn: form.csosn || undefined,
          cst: form.cst || undefined,
          cest: form.cest || undefined,
        }],
      }, crypto.randomUUID()) as { chaveAcesso: string };
      navigate(`/nfe/${result.chaveAcesso}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na emissão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Emitir NF-e" subtitle="Usa cadastro dinâmico do parceiro/produto (endereço IBGE, CSOSN/CST). Homologação aplica razão social padrão SEFAZ no XML." />
      <form onSubmit={submit} className="space-y-6">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Operação</h2>
          <label className="label">Natureza da operação</label>
          <input className="input" value={form.naturezaOperacao} onChange={(e) => set('naturezaOperacao', e.target.value)} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Destinatário</h2>
          {dests.length > 0 && (
            <select className="input mb-4" onChange={(e) => {
              const d = dests.find((x) => x.id === e.target.value);
              if (!d) return;
              const end = (d.endereco ?? emptyEnd) as Endereco;
              setEndereco({
                logradouro: String(end.logradouro ?? ''),
                numero: String(end.numero ?? ''),
                complemento: end.complemento ? String(end.complemento) : undefined,
                bairro: String(end.bairro ?? ''),
                codigoMunicipio: String(end.codigoMunicipio ?? ''),
                municipio: String(end.municipio ?? ''),
                uf: String(end.uf ?? 'MG'),
                cep: String(end.cep ?? ''),
              });
              setForm((f) => ({
                ...f,
                destTipo: (d.tipo as 'PF' | 'PJ' | 'EX') || 'PJ',
                destCnpj: String(d.cpfCnpj ?? ''),
                destNome: String(d.razaoSocial ?? d.apelido ?? ''),
                destIe: String(d.inscricaoEstadual ?? ''),
                indIEDest: String(d.indIEDest ?? '9'),
                email: String(d.emailXml ?? d.email ?? ''),
              }));
            }}>
              <option value="">Selecionar parceiro cadastrado…</option>
              {dests.map((d) => (
                <option key={String(d.id)} value={String(d.id)}>
                  {String(d.apelido)}
                  {(d.aptidao as { aptoEmissaoNfe?: boolean } | undefined)?.aptoEmissaoNfe ? ' · apto' : ' · pendente'}
                </option>
              ))}
            </select>
          )}
          <div className="form-grid">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.destTipo} onChange={(e) => set('destTipo', e.target.value)}>
                <option value="PJ">Pessoa jurídica</option>
                <option value="PF">Pessoa física</option>
              </select>
            </div>
            <div>
              <label className="label">CPF/CNPJ</label>
              <input className="input" required value={form.destCnpj} onChange={(e) => set('destCnpj', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Nome / razão social</label>
              <input className="input" required value={form.destNome} onChange={(e) => set('destNome', e.target.value)} />
            </div>
            <div>
              <label className="label">Indicador IE</label>
              <select className="input" value={form.indIEDest} onChange={(e) => set('indIEDest', e.target.value)}>
                <option value="9">Não contribuinte</option>
                <option value="1">Contribuinte ICMS</option>
                <option value="2">Isento</option>
              </select>
            </div>
            <div>
              <label className="label">IE (se contribuinte)</label>
              <input className="input" value={form.destIe} onChange={(e) => set('destIe', e.target.value)} />
            </div>
          </div>
          {endereco.codigoMunicipio && (
            <p className="mt-3 text-xs text-slate-500">
              Endereço: {endereco.logradouro}, {endereco.numero} — {endereco.municipio}/{endereco.uf} · IBGE {endereco.codigoMunicipio}
            </p>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Item</h2>
          {produtos.length > 0 && (
            <select className="input mb-4" onChange={(e) => {
              const p = produtos.find((x) => x.id === e.target.value);
              if (!p) return;
              setForm((f) => ({
                ...f,
                codigo: String(p.codigo),
                descricao: String(p.descricaoFiscal ?? p.descricao),
                ncm: String(p.ncm),
                cfop: String(p.cfop),
                unidade: String(p.unidade ?? 'UN'),
                valorUnitario: String(p.valorUnitario ?? 0),
                origem: String(p.origem ?? '0'),
                csosn: String(p.csosn ?? ''),
                cst: String(p.cst ?? ''),
                cest: String(p.cest ?? ''),
              }));
            }}>
              <option value="">Selecionar produto…</option>
              {produtos.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {String(p.codigo)} — {String(p.descricao)}
                  {(p.aptidao as { aptoEmissaoNfe?: boolean } | undefined)?.aptoEmissaoNfe ? '' : ' · fiscal pendente'}
                </option>
              ))}
            </select>
          )}
          <div className="form-grid">
            <div><label className="label">Código</label><input className="input" required value={form.codigo} onChange={(e) => set('codigo', e.target.value)} /></div>
            <div><label className="label">NCM</label><input className="input" required value={form.ncm} onChange={(e) => set('ncm', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="label">Descrição</label><input className="input" required value={form.descricao} onChange={(e) => set('descricao', e.target.value)} /></div>
            <div><label className="label">CFOP</label><input className="input" required value={form.cfop} onChange={(e) => set('cfop', e.target.value)} /></div>
            <div><label className="label">Unidade</label><input className="input" value={form.unidade} onChange={(e) => set('unidade', e.target.value)} /></div>
            <div><label className="label">Quantidade</label><input className="input" type="number" step="0.0001" value={form.quantidade} onChange={(e) => set('quantidade', e.target.value)} /></div>
            <div><label className="label">Valor unitário</label><input className="input" type="number" step="0.01" value={form.valorUnitario} onChange={(e) => set('valorUnitario', e.target.value)} /></div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" disabled={loading}>{loading ? 'Autorizando…' : 'Emitir NF-e'}</button>
      </form>
    </>
  );
}
