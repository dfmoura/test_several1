import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import {
  ApiError,
  api,
  type ImplantacaoItem,
  type ImplantacaoMatriz,
  type ImplantacaoStatus,
} from '../lib/api';
import { useAuth } from '../lib/auth';

const STATUS_OPTS: { value: ImplantacaoStatus; label: string }[] = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'OK', label: 'OK' },
  { value: 'RECUSADO', label: 'Recusado' },
  { value: 'NA', label: 'N/A' },
];

const LINHA_LABEL: Record<string, string> = {
  aceito: 'Aceito',
  pronto_cliente: 'Pronto p/ cliente',
  pendente_dev: 'Pendente desenvolvimento',
  bloqueado: 'Bloqueado',
  na: 'N/A',
  em_andamento: 'Em andamento',
};

type Filtro = 'todos' | 'pendentes' | 'flexorc' | 'erp';

function isMatriz(value: unknown): value is ImplantacaoMatriz {
  if (!value || typeof value !== 'object') return false;
  const v = value as ImplantacaoMatriz;
  return Array.isArray(v.itens) && v.resumo != null && v.empresa != null;
}

export function ImplantacaoPage() {
  const { empresaId, hasPermission } = useAuth();
  const [data, setData] = useState<ImplantacaoMatriz | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [salvando, setSalvando] = useState<string | null>(null);

  const podeDev = hasPermission('implantacao.validar_dev');
  const podeCliente = hasPermission('implantacao.validar_cliente');

  const load = useCallback(() => {
    if (!empresaId) {
      setData(null);
      setLoading(false);
      setErro('Selecione uma empresa ativa para ver a implantação.');
      return;
    }

    setLoading(true);
    setErro('');
    void api
      .get<{ data: ImplantacaoMatriz }>('/implantacao', empresaId)
      .then((res) => {
        if (!isMatriz(res.data)) {
          setData(null);
          setErro('Resposta inválida da matriz de implantação. Atualize a página ou tente de novo.');
          return;
        }
        setData(res.data);
      })
      .catch((e: unknown) => {
        setData(null);
        if (e instanceof ApiError) {
          const detalhe =
            e.status === 403
              ? 'Sem permissão para ver a implantação (implantacao.ler).'
              : e.status === 422
                ? e.message || 'Selecione uma empresa ativa.'
                : e.message || `Erro ${e.status}`;
          setErro(detalhe);
          return;
        }
        setErro(e instanceof Error && e.message ? e.message : 'Não foi possível carregar a implantação.');
      })
      .finally(() => setLoading(false));
  }, [empresaId]);

  useEffect(() => {
    load();
  }, [load]);

  const itensFiltrados = useMemo(() => {
    if (!data?.itens) return [];
    return data.itens.filter((item) => {
      if (filtro === 'flexorc') return item.superficie === 'flexorc';
      if (filtro === 'erp') return item.superficie === 'erp';
      if (filtro === 'pendentes') {
        return item.linha !== 'aceito' && item.linha !== 'na';
      }
      return true;
    });
  }, [data, filtro]);

  const porOnda = useMemo(() => {
    const map = new Map<number, ImplantacaoItem[]>();
    for (const item of itensFiltrados) {
      const list = map.get(item.onda) ?? [];
      list.push(item);
      map.set(item.onda, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [itensFiltrados]);

  const validar = async (
    item: ImplantacaoItem,
    eixo: 'dev' | 'cliente',
    status: ImplantacaoStatus,
  ) => {
    if (!empresaId) return;
    const key = `${item.codigo}:${eixo}`;
    setSalvando(key);
    setErro('');
    try {
      const res = await api.patch<{ data: ImplantacaoItem }>(
        `/implantacao/${item.codigo}`,
        { eixo, status },
        empresaId,
      );
      setData((prev) => {
        if (!prev) return prev;
        const itens = prev.itens.map((i) => (i.codigo === item.codigo ? res.data : i));
        return { ...prev, itens };
      });
      load();
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setErro(e.message || `Erro ${e.status} ao gravar o aceite.`);
      } else {
        setErro(e instanceof Error ? e.message : 'Falha ao gravar o aceite.');
      }
    } finally {
      setSalvando(null);
    }
  };

  if (!empresaId) {
    return (
      <div>
        <PageHeader
          title="Implantação"
          description="Selecione uma empresa ativa para ver o aceite de go-live."
        />
      </div>
    );
  }

  const resumo = data?.resumo;

  return (
    <div className="implantacao-page">
      <PageHeader
        title="Implantação"
        description="Aceite de go-live: o que já opera e o que falta — validação do desenvolvimento e do cliente."
        actions={
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => load()} disabled={loading}>
            Atualizar
          </button>
        }
      />

      {erro ? (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      ) : null}

      {loading && !data ? (
        <p className="subtitle">Carregando a matriz de implantação…</p>
      ) : null}

      {!loading && !data && !erro ? (
        <p className="subtitle">Nenhuma matriz disponível. Use Atualizar.</p>
      ) : null}

      {data ? (
        <>
          <section className="implantacao-resumo" aria-label="Resumo da implantação">
            <div className="implantacao-resumo-grid">
              <div>
                <span className="implantacao-kicker">Empresa</span>
                <strong>
                  {data.empresa.codigo} · {data.empresa.nome}
                </strong>
              </div>
              <div>
                <span className="implantacao-kicker">Comercial aceito</span>
                <strong>
                  {resumo?.flexorc?.aceitos ?? 0}/{resumo?.flexorc?.total ?? 0}
                  <span className="implantacao-pct"> ({resumo?.flexorc?.pct_aceitos ?? 0}%)</span>
                </strong>
              </div>
              <div>
                <span className="implantacao-kicker">ERP (mapa) aceito</span>
                <strong>
                  {resumo?.erp?.aceitos ?? 0}/{resumo?.erp?.total ?? 0}
                  <span className="implantacao-pct"> ({resumo?.erp?.pct_aceitos ?? 0}%)</span>
                </strong>
              </div>
              <div>
                <span className="implantacao-kicker">Já operamos até</span>
                <strong>{resumo?.ja_operamos_ate?.nome ?? '— ainda no início —'}</strong>
              </div>
              <div>
                <span className="implantacao-kicker">Próximo elo</span>
                <strong>{resumo?.proximo_elo?.nome ?? 'Cadeia principal aceita'}</strong>
              </div>
            </div>
            <p className="implantacao-nota">
              Item <strong>Aceito</strong> exige OK do desenvolvimento e do cliente. Evidência do
              sistema é apoio — não substitui o aceite. Itens ERP são mapa de prontidão; o menu
              inclui a cadeia operacional completa (comercial → produção → saída → caixa/compras/estoque) — exceções e cadastros avançados conforme implantação.
            </p>
          </section>

          <div className="implantacao-filtros" role="group" aria-label="Filtros">
            {(
              [
                ['todos', 'Todos'],
                ['pendentes', 'Pendentes'],
                ['flexorc', 'Comercial agora'],
                ['erp', 'ERP completo'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`btn btn-sm ${filtro === id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltro(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {porOnda.map(([onda, itens]) => (
            <section key={onda} className="implantacao-onda">
              <h2>
                Onda {onda} · {itens[0]?.onda_nome}
              </h2>
              <div className="table-wrap">
                <table className="data-table implantacao-table">
                  <thead>
                    <tr>
                      <th>Atividade</th>
                      <th>Evidência</th>
                      <th>Desenvolvimento</th>
                      <th>Cliente</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => (
                      <tr key={item.codigo} className={item.elo ? 'is-elo' : undefined}>
                        <td>
                          <div className="implantacao-atividade">
                            <strong>{item.nome}</strong>
                            <span className="implantacao-porque">{item.porque}</span>
                            <span className="implantacao-meta">
                              {item.superficie === 'flexorc' ? 'Comercial' : 'ERP'}
                              {item.paralelo ? ' · paralelo' : ''}
                              {item.elo ? ' · elo' : ''}
                              {item.rota ? (
                                <>
                                  {' · '}
                                  <Link to={item.rota}>abrir</Link>
                                </>
                              ) : null}
                            </span>
                          </div>
                        </td>
                        <td>
                          {item.evidencia ? (
                            <span
                              className={`implantacao-ev ${item.evidencia.ok ? 'is-ok' : 'is-off'}`}
                            >
                              {item.evidencia.label}
                            </span>
                          ) : (
                            <span className="implantacao-ev is-muted">—</span>
                          )}
                        </td>
                        <td>
                          <StatusCell
                            status={item.status_dev}
                            disabled={!podeDev || salvando === `${item.codigo}:dev`}
                            onChange={(s) => void validar(item, 'dev', s)}
                            meta={
                              item.validado_dev_em
                                ? `${item.validado_dev_por_nome ?? '—'} · ${formatWhen(item.validado_dev_em)}`
                                : null
                            }
                          />
                        </td>
                        <td>
                          <StatusCell
                            status={item.status_cliente}
                            disabled={!podeCliente || salvando === `${item.codigo}:cliente`}
                            onChange={(s) => void validar(item, 'cliente', s)}
                            meta={
                              item.validado_cliente_em
                                ? `${item.validado_cliente_por_nome ?? '—'} · ${formatWhen(item.validado_cliente_em)}`
                                : null
                            }
                          />
                        </td>
                        <td>
                          <span className={`implantacao-linha implantacao-linha--${item.linha}`}>
                            {LINHA_LABEL[item.linha] ?? item.linha}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      ) : null}
    </div>
  );
}

function StatusCell({
  status,
  disabled,
  onChange,
  meta,
}: {
  status: ImplantacaoStatus;
  disabled: boolean;
  onChange: (s: ImplantacaoStatus) => void;
  meta: string | null;
}) {
  return (
    <div className="implantacao-status-cell">
      <select
        className="input"
        value={status}
        disabled={disabled}
        aria-label="Status do aceite"
        onChange={(e) => onChange(e.target.value as ImplantacaoStatus)}
      >
        {STATUS_OPTS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {meta ? <span className="implantacao-stamp">{meta}</span> : null}
    </div>
  );
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
