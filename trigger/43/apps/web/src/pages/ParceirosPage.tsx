import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { IconMapPin } from '../components/NavIcons';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type Parceiro } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  formatCnpjCpf,
  formatKmCarroDaEmpresa,
  formatLatLng,
  papelLabel,
  parceiroPosicaoStatus,
} from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

const PAPEIS = [
  'cliente',
  'fornecedor',
  'colaborador',
  'transportadora',
  'banco',
  'entidade',
  'vendedor',
  'contador',
] as const;

type PapelTab = '' | (typeof PAPEIS)[number];

const PAPEL_TABS: { id: PapelTab; label: string }[] = [
  { id: '', label: 'Todos' },
  ...PAPEIS.map((id) => ({ id, label: papelLabel(id) })),
];

function parsePapelTab(raw: string | null): PapelTab {
  if (!raw) return '';
  return (PAPEIS as readonly string[]).includes(raw) ? (raw as PapelTab) : '';
}

const DISTANCIA_ERRO_HINT: Record<string, string> = {
  sem_origem: 'Cadastre a origem operacional da empresa (aba Operação).',
  chave_ausente: 'Serviço de rota não configurado.',
  chave_invalida: 'Serviço de rota indisponível.',
  cota: 'Cota temporária do serviço de rota. Tente de novo em instantes.',
  sem_rota: 'Não há rota de carro até este ponto.',
  geo_impreciso: 'CEP impreciso — não é distância de carro.',
  sem_destino: 'Sem posição do CEP ainda.',
  sem_ponto: 'Este CEP não tem ponto geográfico.',
  provedor_proibido: 'Provedor de rota não permitido.',
  indisponivel: 'Rota indisponível no momento.',
};

function getPapeis(p: Parceiro): string[] {
  return PAPEIS.filter((key) => p[`papel_${key}` as keyof Parceiro] === true).map(papelLabel);
}

function fiscalSortKey(p: Parceiro): string {
  if (p.cadastro_fiscal_completo) return 'Completo';
  if (p.is_prospect) return 'Prospect';
  return 'Incompleto';
}

const SORT = {
  codigo: (p: Parceiro) => p.codigo,
  nome: (p: Parceiro) => p.nome_fantasia ?? p.razao_social,
  documento: (p: Parceiro) => p.cnpj_cpf,
  papeis: (p: Parceiro) => getPapeis(p).join(', '),
  fiscal: (p: Parceiro) => fiscalSortKey(p),
  situacao: (p: Parceiro) => p.situacao,
};

function tooltipPosicao(
  p: Parceiro,
  status: 'ok' | 'faltando' | 'bloqueado',
  empresaId: number | null,
  empresaTemOrigem: boolean,
): string {
  if (status === 'ok') {
    const km = formatKmCarroDaEmpresa(
      p.distancia_km,
      p.distancia_fonte,
      p.distancia_empresa_id,
      empresaId,
    );
    const ponto = formatLatLng(p.latitude, p.longitude);
    return [ponto, km].filter(Boolean).join(' · ') || 'Posição e distância ok';
  }
  if (status === 'bloqueado') {
    return 'Informe o endereço (ou CEP) no cadastro para calcular posição e distância.';
  }
  if (!empresaTemOrigem) {
    return 'Sem origem da planta. Clique para gravar o ponto do parceiro; o km exige a origem na empresa.';
  }
  return 'Sem posição/distância desta empresa. Clique para atualizar.';
}

export function ParceirosPage() {
  const { hasPermission, empresaId, empresas } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPermission('parceiro.escrever');
  const origemEmp = empresas.find((e) => e.id === empresaId);
  const empresaTemOrigem = Boolean(origemEmp?.origem_latitude && origemEmp?.origem_longitude);

  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [q, setQ] = useState('');
  const [papel, setPapelState] = useState<PapelTab>(() => parsePapelTab(searchParams.get('papel')));
  const [loading, setLoading] = useState(true);
  const [geoBusyId, setGeoBusyId] = useState<number | null>(null);
  const [geoFlash, setGeoFlash] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(parceiros, SORT);

  const load = useCallback(async (search?: string, papelFilter?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const qTrim = search?.trim();
      if (qTrim) params.set('q', qTrim);
      if (papelFilter) params.set('papel', papelFilter);
      const qs = params.toString();
      const res = await api.get<{ data: Parceiro[] }>(`/parceiros${qs ? `?${qs}` : ''}`);
      setParceiros(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(undefined, papel || undefined);
    // Carga inicial (aba vinda da URL). Trocas de aba/busca disparam load à parte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPapel = (next: PapelTab) => {
    if (next === papel) return;
    setPapelState(next);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next) p.set('papel', next);
        else p.delete('papel');
        return p;
      },
      { replace: true },
    );
    void load(q, next || undefined);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(q, papel || undefined);
  };

  const atualizarPosicao = async (p: Parceiro) => {
    if (!canWrite || geoBusyId != null) return;
    setGeoBusyId(p.id);
    setGeoFlash(null);
    try {
      const res = await api.post<{ data: Parceiro; distancia_erro?: string }>(
        `/parceiros/${p.id}/posicao-distancia`,
      );
      setParceiros((prev) => prev.map((row) => (row.id === p.id ? { ...row, ...res.data } : row)));
      if (res.distancia_erro) {
        setGeoFlash({
          tipo: 'erro',
          texto:
            DISTANCIA_ERRO_HINT[res.distancia_erro] ??
            'Posição gravada; distância indisponível no momento.',
        });
      } else {
        const km = formatKmCarroDaEmpresa(
          res.data.distancia_km,
          res.data.distancia_fonte,
          res.data.distancia_empresa_id,
          empresaId,
        );
        setGeoFlash({
          tipo: 'ok',
          texto: km
            ? `${p.codigo}: ${km}.`
            : `${p.codigo}: posição atualizada.`,
        });
      }
    } catch (err) {
      setGeoFlash({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Não foi possível atualizar posição e distância.',
      });
    } finally {
      setGeoBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Parceiros"
        description="Cadastro único PAR: cliente, prospect, fornecedor e demais classificações. Um prospect (nome, contato, cidade) já permite orçar."
        actions={
          <div className="btn-row">
            <Link to="/como-cadastra#parceiro" className="btn btn-secondary">
              Como cadastra
            </Link>
            {canWrite ? (
              <>
                <Link to="/parceiros/importar" className="btn btn-secondary">
                  Importar CSV
                </Link>
                <Link to="/parceiros/novo" className="btn btn-primary">
                  Novo parceiro
                </Link>
              </>
            ) : null}
          </div>
        }
      />

      <div className="tabs tabs-parceiro" role="tablist" aria-label="Classificação do parceiro">
        {PAPEL_TABS.map((t) => (
          <button
            key={t.id || 'todos'}
            type="button"
            role="tab"
            className={`tab${papel === t.id ? ' active' : ''}`}
            aria-selected={papel === t.id}
            onClick={() => setPapel(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label htmlFor="parceiros-busca">Buscar</label>
              <input
                id="parceiros-busca"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nome, código ou CNPJ/CPF"
              />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button type="submit" className="btn btn-secondary">
                Buscar
              </button>
            </div>
          </form>
        </div>
      </div>

      {geoFlash ? (
        <p
          className={geoFlash.tipo === 'ok' ? 'form-hint' : 'form-error'}
          style={{ margin: '0 0 0.75rem' }}
          role="status"
        >
          {geoFlash.texto}
        </p>
      ) : null}

      <div className="card">
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : parceiros.length === 0 ? (
            <div className="empty-state empty-state--cta">
              <p>
                {papel || q.trim()
                  ? papel && !q.trim()
                    ? `Nenhum parceiro com classificação ${papelLabel(papel)}.`
                    : 'Nenhum resultado para a busca nesta classificação.'
                  : 'Nenhum parceiro ainda. Um prospect (nome, contato, cidade) já permite orçar.'}
              </p>
              {canWrite && !papel && !q.trim() ? (
                <Link to="/parceiros/novo" className="btn btn-primary">
                  Novo parceiro
                </Link>
              ) : null}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="codigo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Código
                  </SortableTh>
                  <SortableTh column="nome" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Razão social
                  </SortableTh>
                  <SortableTh
                    column="documento"
                    sorts={sorts} sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                    label="CNPJ ou CPF"
                  >
                    CNPJ/CPF
                  </SortableTh>
                  <SortableTh column="papeis" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Classificação
                  </SortableTh>
                  <SortableTh column="fiscal" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Fiscal
                  </SortableTh>
                  <SortableTh column="situacao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Situação
                  </SortableTh>
                  <th className="th-icon" title="Posição e distância" aria-label="Posição e distância">
                    <span className="sr-only">Posição</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const status = parceiroPosicaoStatus(p, empresaId);
                  const tip = tooltipPosicao(p, status, empresaId, empresaTemOrigem);
                  const busy = geoBusyId === p.id;

                  return (
                    <tr
                      key={p.id}
                      className="clickable"
                      onClick={() => navigate(`/parceiros/${p.id}`)}
                    >
                      <td>{p.codigo}</td>
                      <td>{p.nome_fantasia ?? p.razao_social}</td>
                      <td>{formatCnpjCpf(p.cnpj_cpf) || '—'}</td>
                      <td>{getPapeis(p).join(', ') || '—'}</td>
                      <td>
                        {p.cadastro_fiscal_completo
                          ? 'Completo'
                          : p.is_prospect
                            ? 'Prospect'
                            : 'Incompleto'}
                      </td>
                      <td>
                        <StatusPill status={p.situacao} />
                      </td>
                      <td
                        className="td-icon"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {status === 'ok' || !canWrite || status === 'bloqueado' ? (
                          <span
                            className={`par-geo par-geo--${status}`}
                            title={tip}
                            aria-label={tip}
                          >
                            <IconMapPin />
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={`btn-icon par-geo par-geo--${status}`}
                            title={tip}
                            aria-label={`${p.codigo}: atualizar posição e distância`}
                            aria-busy={busy}
                            disabled={busy || geoBusyId != null}
                            onClick={() => void atualizarPosicao(p)}
                          >
                            {busy ? '…' : <IconMapPin />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
