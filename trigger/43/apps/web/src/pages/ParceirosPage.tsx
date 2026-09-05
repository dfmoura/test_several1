import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const canWrite = hasPermission('parceiro.escrever');
  const origemEmp = empresas.find((e) => e.id === empresaId);
  const empresaTemOrigem = Boolean(origemEmp?.origem_latitude && origemEmp?.origem_longitude);

  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [q, setQ] = useState('');
  const [papel, setPapel] = useState('');
  const [loading, setLoading] = useState(true);
  const [geoBusyId, setGeoBusyId] = useState<number | null>(null);
  const [geoFlash, setGeoFlash] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(parceiros, SORT);

  const load = async (search?: string, papelFilter?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (papelFilter) params.set('papel', papelFilter);
      const qs = params.toString();
      const res = await api.get<{ data: Parceiro[] }>(`/parceiros${qs ? `?${qs}` : ''}`);
      setParceiros(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(q, papel);
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
          canWrite ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link to="/parceiros/importar" className="btn btn-secondary">
                Importar CSV
              </Link>
              <Link to="/parceiros/novo" className="btn btn-primary">
                Novo parceiro
              </Link>
            </div>
          ) : undefined
        }
      />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nome, código ou CNPJ/CPF"
              />
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label>Classificação</label>
              <select value={papel} onChange={(e) => setPapel(e.target.value)}>
                <option value="">Todas</option>
                {PAPEIS.map((p) => (
                  <option key={p} value={p}>
                    {papelLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button type="submit" className="btn btn-secondary">
                Filtrar
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
              <p>Nenhum parceiro ainda. Um prospect (nome, contato, cidade) já permite orçar.</p>
              {canWrite ? (
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
