import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ApiError, api } from '../lib/api';

type CatalogoFonte = {
  id: string;
  descricao: string;
  perguntas_exemplo?: string[];
  campos: { id: string; label: string }[];
};

type Planejamento = {
  id: number;
  status: string;
  prompt: string;
  titulo: string | null;
  orientacao: string;
  spec: {
    titulo?: string;
    fonte?: string;
    colunas?: string[];
    filtros?: unknown[];
    ordenacao?: unknown[];
    limite?: number;
    totais?: unknown[];
  } | null;
  resumo_legivel: string | null;
  amostra: Record<string, unknown>[] | null;
  total_estimado: number | null;
  avisos: string[];
  tentativas: number;
  erro_mensagem: string | null;
  provedor_ia?: { nome: string; provedor: string; modelo: string | null } | null;
};

type Etapa = 'pedir' | 'planejando' | 'conferir';

export function RelatorioNovoPage() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>('pedir');
  const [prompt, setPrompt] = useState('');
  const [titulo, setTitulo] = useState('');
  const [orientacao, setOrientacao] = useState<'retrato' | 'paisagem'>('retrato');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [exemplos, setExemplos] = useState<string[]>([]);
  const [planejarDisponivel, setPlanejarDisponivel] = useState(true);
  const [planejamentoId, setPlanejamentoId] = useState<number | null>(null);
  const [plano, setPlano] = useState<Planejamento | null>(null);
  const [specLocal, setSpecLocal] = useState<Planejamento['spec'] | null>(null);
  const [narrativaHint, setNarrativaHint] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{
          data: { fontes: CatalogoFonte[]; planejar_disponivel?: boolean };
        }>('/relatorios/catalogo');
        setPlanejarDisponivel(res.data.planejar_disponivel !== false);
        const exemplosFlat = res.data.fontes.flatMap((f) => f.perguntas_exemplo ?? []).slice(0, 8);
        setExemplos(exemplosFlat);
      } catch {
        // catálogo é opcional na UX
      }
    })();
  }, []);

  const loadPlano = useCallback(async (id: number) => {
    const res = await api.get<{ data: Planejamento }>(`/relatorios/planejamentos/${id}`);
    setPlano(res.data);
    if (res.data.status === 'PRONTO' && res.data.spec) {
      setSpecLocal({ ...res.data.spec });
      setEtapa('conferir');
      if (res.data.spec.titulo) setTitulo(res.data.spec.titulo);
    }
    if (res.data.status === 'ERRO') {
      setErro(res.data.erro_mensagem || 'Falha no planejamento');
      setEtapa('pedir');
    }
    return res.data;
  }, []);

  useEffect(() => {
    if (!planejamentoId || etapa !== 'planejando') return;
    const t = window.setInterval(() => {
      void loadPlano(planejamentoId);
    }, 2000);
    return () => window.clearInterval(t);
  }, [planejamentoId, etapa, loadPlano]);

  const colunasDisponiveis = useMemo(() => {
    return (specLocal?.colunas ?? []) as string[];
  }, [specLocal]);

  const onPlanejar = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErro('');
    try {
      if (!planejarDisponivel) {
        await gerarDireto(null);
        return;
      }
      const res = await api.post<{ data: Planejamento }>('/relatorios/planejar', {
        prompt: prompt.trim(),
        orientacao,
        titulo: titulo.trim() || null,
      });
      setPlanejamentoId(res.data.id);
      setPlano(res.data);
      setEtapa('planejando');
      setNarrativaHint('A IA está montando o programa…');
    } catch (err) {
      setErro(formatErro(err));
    } finally {
      setSaving(false);
    }
  };

  const gerarDireto = async (spec: Planejamento['spec'] | null) => {
    setSaving(true);
    setErro('');
    try {
      const body: Record<string, unknown> = {
        prompt: prompt.trim(),
        orientacao,
        titulo: titulo.trim() || null,
      };
      if (spec) body.spec = spec;
      const res = await api.post<{ data: { id: number } }>('/relatorios', body);
      navigate(`/relatorios/${res.data.id}`);
    } catch (err) {
      setErro(formatErro(err));
    } finally {
      setSaving(false);
    }
  };

  const onGerarPdf = async () => {
    if (!specLocal) return;
    const limpo = {
      ...specLocal,
      limite: Number(specLocal.limite) || 200,
      colunas: (specLocal.colunas ?? []).filter(Boolean),
    };
    await gerarDireto(limpo);
  };

  const toggleColuna = (col: string) => {
    if (!specLocal) return;
    const atual = new Set(specLocal.colunas ?? []);
    if (atual.has(col)) {
      if (atual.size <= 1) return;
      atual.delete(col);
    } else {
      atual.add(col);
    }
    setSpecLocal({ ...specLocal, colunas: Array.from(atual) });
  };

  return (
    <>
      <PageHeader
        title="Novo relatório"
        description={
          etapa === 'conferir'
            ? 'Confira o que a IA entendeu. Ajuste se precisar e só então gere o PDF.'
            : 'Descreva o que precisa. O sistema planeja um programa seguro (allowlist) antes de gerar o PDF.'
        }
        actions={
          <Link to="/relatorios" className="btn btn-secondary">
            Voltar
          </Link>
        }
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      {etapa === 'pedir' || etapa === 'planejando' ? (
        <form className="card" onSubmit={(e) => void onPlanejar(e)}>
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="rel-titulo">Título (opcional)</label>
              <input
                id="rel-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={200}
                placeholder="Ex.: Orçamentos calculados do mês"
                disabled={etapa === 'planejando'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="rel-prompt">Pedido *</label>
              <textarea
                id="rel-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                required
                minLength={8}
                maxLength={4000}
                disabled={etapa === 'planejando'}
                placeholder="Ex.: Liste os orçamentos com status CALCULADO, com código, cliente, total e data de criação, ordenados do mais recente."
              />
              {exemplos.length > 0 ? (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {exemplos.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '0.35rem 0.6rem' }}
                      disabled={etapa === 'planejando'}
                      onClick={() => setPrompt(ex)}
                    >
                      {ex.length > 72 ? `${ex.slice(0, 72)}…` : ex}
                    </button>
                  ))}
                </div>
              ) : (
                <small style={{ color: 'var(--text-muted)' }}>
                  Fontes disponíveis: orçamentos, parceiros, produtos e mapa de facas.
                </small>
              )}
            </div>

            <fieldset className="form-group" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Orientação do PDF *</legend>
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="orientacao"
                    checked={orientacao === 'retrato'}
                    disabled={etapa === 'planejando'}
                    onChange={() => setOrientacao('retrato')}
                  />
                  Retrato (A4)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="orientacao"
                    checked={orientacao === 'paisagem'}
                    disabled={etapa === 'planejando'}
                    onChange={() => setOrientacao('paisagem')}
                  />
                  Paisagem (A4)
                </label>
              </div>
            </fieldset>

            {etapa === 'planejando' ? (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>{narrativaHint || 'Planejando…'}</p>
            ) : null}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Link to="/relatorios" className="btn btn-secondary">
                Cancelar
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving || prompt.trim().length < 8 || etapa === 'planejando'}
                onClick={() => void gerarDireto(null)}
                title="Gera sem etapa de conferência (fluxo clássico)"
              >
                Gerar direto
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || prompt.trim().length < 8 || etapa === 'planejando'}
              >
                {etapa === 'planejando' ? 'Planejando…' : planejarDisponivel ? 'Planejar e conferir' : 'Gerar relatório'}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {etapa === 'conferir' && specLocal && plano ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="card">
            <div className="card-body">
              <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>O que será gerado</h2>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  fontFamily: 'inherit',
                  fontSize: 14,
                  lineHeight: 1.55,
                }}
              >
                {plano.resumo_legivel}
              </pre>
              {plano.avisos?.length ? (
                <p style={{ color: 'var(--text-muted)', marginBottom: 0, marginTop: '0.75rem' }}>
                  Avisos: {plano.avisos.join(' · ')}
                </p>
              ) : null}
              {plano.provedor_ia ? (
                <p style={{ color: 'var(--text-muted)', marginBottom: 0, marginTop: '0.5rem', fontSize: 13 }}>
                  Planejado por {plano.provedor_ia.nome}
                  {plano.provedor_ia.modelo ? ` · ${plano.provedor_ia.modelo}` : ''}
                  {plano.tentativas > 1 ? ` · ${plano.tentativas} tentativas` : ''}
                </p>
              ) : null}
            </div>
          </div>

          <div className="card">
            <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
              <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Ajustes finos</h2>
              <div className="form-group">
                <label htmlFor="conf-titulo">Título</label>
                <input
                  id="conf-titulo"
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value);
                    setSpecLocal({ ...specLocal, titulo: e.target.value || specLocal.titulo });
                  }}
                  maxLength={200}
                />
              </div>
              <div className="form-group">
                <label htmlFor="conf-limite">Limite de linhas</label>
                <input
                  id="conf-limite"
                  type="number"
                  min={1}
                  max={1000}
                  value={specLocal.limite ?? 200}
                  onChange={(e) =>
                    setSpecLocal({ ...specLocal, limite: Math.min(1000, Math.max(1, Number(e.target.value) || 1)) })
                  }
                />
              </div>
              <fieldset className="form-group" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Orientação</legend>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      checked={orientacao === 'retrato'}
                      onChange={() => setOrientacao('retrato')}
                    />
                    Retrato
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      checked={orientacao === 'paisagem'}
                      onChange={() => setOrientacao('paisagem')}
                    />
                    Paisagem
                  </label>
                </div>
              </fieldset>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Colunas</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {colunasDisponiveis.map((col) => (
                    <label key={col} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                      <input
                        type="checkbox"
                        checked={(specLocal.colunas ?? []).includes(col)}
                        onChange={() => toggleColuna(col)}
                      />
                      {col}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {plano.amostra && plano.amostra.length > 0 ? (
            <div className="card">
              <div className="card-body" style={{ overflowX: 'auto' }}>
                <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>
                  Amostra ({plano.amostra.length}
                  {plano.total_estimado != null ? ` de ~${plano.total_estimado}` : ''})
                </h2>
                <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {(specLocal.colunas ?? []).map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plano.amostra.slice(0, 20).map((row, i) => (
                      <tr key={i}>
                        {(specLocal.colunas ?? []).map((c) => (
                          <td key={c}>{formatCell(row[c])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => {
                setEtapa('pedir');
                setPlano(null);
                setSpecLocal(null);
                setPlanejamentoId(null);
              }}
            >
              Refazer pedido
            </button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void onGerarPdf()}>
              {saving ? 'Gerando…' : 'Gerar PDF'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatErro(err: unknown): string {
  if (err instanceof ApiError && err.details) {
    return Object.entries(err.details)
      .flatMap(([k, msgs]) => msgs.map((m) => `${k}: ${m}`))
      .join(' ');
  }
  return err instanceof Error ? err.message : 'Falha ao processar';
}

function formatCell(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string' && v.includes('<svg')) return '(desenho)';
  return String(v);
}
