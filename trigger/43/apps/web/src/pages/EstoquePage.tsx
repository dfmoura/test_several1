import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EstoqueConsolidadoPanel } from '../components/EstoqueConsolidadoPanel';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { EstoquePosicaoPanel } from '../components/EstoquePosicaoPanel';
import { PageHeader } from '../components/PageHeader';
import { api, type EstoqueLote, type EstoqueSaldo } from '../lib/api';
import {
  familiasNaPosicao,
  itensPosicao,
  linhasConsolidado,
  linhaTemStatus,
  somaValorPosicao,
} from '../lib/estoqueUi';
import { familiaLabel } from '../lib/format';
import { useAuth } from '../lib/auth';

type VistaSaldo = 'analitico' | 'consolidado';

function loteComSaldo(lote: EstoqueLote): boolean {
  return Number(lote.qtde) > 0;
}

function vistaFromParams(params: URLSearchParams): VistaSaldo {
  return params.get('vista') === 'consolidado' ? 'consolidado' : 'analitico';
}

export function EstoquePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const [saldos, setSaldos] = useState<EstoqueSaldo[]>([]);
  const [q, setQ] = useState('');
  const [validadeFiltro, setValidadeFiltro] = useState('');
  const [familia, setFamilia] = useState(() => searchParams.get('familia') ?? '');
  const [loading, setLoading] = useState(true);
  const vista = vistaFromParams(searchParams);

  useEffect(() => {
    const vistaParam = searchParams.get('vista');
    const vistaInvalida = vistaParam != null && vistaParam !== 'consolidado';
    if (!searchParams.has('tab') && !searchParams.has('grupo') && !vistaInvalida) return;
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('tab');
        p.delete('grupo');
        if (p.get('vista') && p.get('vista') !== 'consolidado') p.delete('vista');
        return p;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const setVista = useCallback(
    (next: VistaSaldo) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete('tab');
          p.delete('grupo');
          if (next === 'consolidado') p.set('vista', 'consolidado');
          else p.delete('vista');
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setFamiliaUrl = useCallback(
    (fam: string) => {
      setFamilia(fam);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete('tab');
          p.delete('grupo');
          if (fam) p.set('familia', fam);
          else p.delete('familia');
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const volumesAtivos = useMemo(
    () => saldos.flatMap((s) => (s.lotes ?? []).filter(loteComSaldo)),
    [saldos],
  );

  const alertas = useMemo(() => {
    const vencidos = volumesAtivos.filter((l) => l.status === 'VENCIDO').length;
    const aVencer = volumesAtivos.filter((l) => l.status === 'A_VENCER').length;
    return { vencidos, aVencer };
  }, [volumesAtivos]);

  const posicaoItens = useMemo(
    () => itensPosicao(saldos, q, familia),
    [saldos, q, familia],
  );

  const posicaoVisivel = useMemo(() => {
    if (!validadeFiltro) return posicaoItens;
    return posicaoItens
      .map((item) => ({
        ...item,
        formatos: item.formatos.filter((fmt) =>
          linhaTemStatus(item.saldo, fmt, validadeFiltro),
        ),
      }))
      .filter((item) => item.formatos.length > 0);
  }, [posicaoItens, validadeFiltro]);

  const consolidadoVisivel = useMemo(
    () => (vista === 'consolidado' ? linhasConsolidado(saldos, q, familia) : []),
    [vista, saldos, q, familia],
  );

  const familiasFiltro = useMemo(() => familiasNaPosicao(saldos), [saldos]);

  const volumesSemLocal = useMemo(
    () => volumesAtivos.filter((l) => l.endereco_id == null).length,
    [volumesAtivos],
  );

  const recarregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const s = await api.get<{ data: EstoqueSaldo[] }>('/estoque/saldos');
      setSaldos(s.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const alternarValidade = (status: 'VENCIDO' | 'A_VENCER') => {
    if (vista !== 'analitico' || validadeFiltro !== status) {
      setValidadeFiltro(status);
      setVista('analitico');
      return;
    }
    setValidadeFiltro('');
  };

  const filtroAtivo = Boolean(q || familia || (vista === 'analitico' && validadeFiltro));
  const listaVazia = vista === 'consolidado' ? consolidadoVisivel.length === 0 : posicaoVisivel.length === 0;

  return (
    <div className="estoque-posicao-page">
      <PageHeader
        title="Estoque"
        description="Saldo por item e por volume. O local é o código do mapa."
      />

      <EstoqueModuleNav />

      <p className="estoque-ops-line muted">
        Entrada na{' '}
        <Link to="/compras/ordens">ordem de compra</Link>
        {' · '}
        <Link to="/estoque/guardar">Guardar</Link>
        {' · '}
        <Link to="/estoque/retiradas">A buscar</Link>
        {' · '}
        <Link to="/estoque/mapa">Mapa dos locais</Link>
        {' · '}
        <Link to="/estoque/lotes/etiquetas">Reimprimir volumes</Link>
        {' · '}
        <Link to="/estoque/enderecos/etiquetas">Etiquetas dos locais</Link>
      </p>

      {!loading && (
        <div className="estoque-kpi detail-meta" aria-label="Resumo da posição">
          <div>
            <span>SKUs</span>
            <strong>{saldos.length}</strong>
          </div>
          <div>
            <span>Valor</span>
            <strong>{somaValorPosicao(saldos)}</strong>
          </div>
          <div>
            <span>Volumes</span>
            <strong>{volumesAtivos.length}</strong>
          </div>
        </div>
      )}

      {(alertas.vencidos > 0 || alertas.aVencer > 0) && (
        <div
          className={`alert alert--compact ${alertas.vencidos > 0 ? 'alert-error' : 'alert-warning'}`}
          style={{ marginBottom: '0.75rem' }}
        >
          {alertas.vencidos > 0 && (
            <button
              type="button"
              className="linkish"
              aria-pressed={vista === 'analitico' && validadeFiltro === 'VENCIDO'}
              onClick={() => alternarValidade('VENCIDO')}
            >
              {alertas.vencidos} vencido(s)
            </button>
          )}
          {alertas.vencidos > 0 && alertas.aVencer > 0 ? <span> · </span> : null}
          {alertas.aVencer > 0 && (
            <button
              type="button"
              className="linkish"
              aria-pressed={vista === 'analitico' && validadeFiltro === 'A_VENCER'}
              onClick={() => alternarValidade('A_VENCER')}
            >
              {alertas.aVencer} a vencer
            </button>
          )}
        </div>
      )}

      {!loading && volumesSemLocal > 0 && (
        <div className="alert alert-warning alert--compact" style={{ marginBottom: '0.75rem' }}>
          {volumesSemLocal} volume(s) com saldo ainda sem local —{' '}
          <Link to="/estoque/guardar">Guardar no local</Link>
          {' · '}
          <Link to="/estoque/lotes/etiquetas?sem_endereco=1">Etiquetas</Link>
        </div>
      )}

      <div className="card estoque-filtros-card">
        <div className="card-body">
          <div className="form-grid" style={{ alignItems: 'end' }}>
            <div className="form-group span-2">
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  vista === 'consolidado'
                    ? 'Produto, quantidade, dimensão…'
                    : 'Produto, dimensão, local…'
                }
              />
            </div>
            <div className="form-group">
              <label>Família</label>
              <select value={familia} onChange={(e) => setFamiliaUrl(e.target.value)}>
                <option value="">Todas</option>
                {familiasFiltro.map((f) => (
                  <option key={f} value={f}>
                    {f} — {familiaLabel(f)}
                  </option>
                ))}
              </select>
            </div>
            {vista === 'analitico' && (
              <div className="form-group">
                <label>Validade</label>
                <select value={validadeFiltro} onChange={(e) => setValidadeFiltro(e.target.value)}>
                  <option value="">Todas</option>
                  <option value="VENCIDO">Vencidos</option>
                  <option value="A_VENCER">A vencer</option>
                  <option value="OK">No prazo</option>
                  <option value="SEM_VALIDADE">Sem validade</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tabs estoque-vista-nav" role="tablist" aria-label="Leitura do saldo">
        <button
          type="button"
          role="tab"
          className={`tab${vista === 'analitico' ? ' active' : ''}`}
          aria-selected={vista === 'analitico'}
          onClick={() => setVista('analitico')}
        >
          Analítico
        </button>
        <button
          type="button"
          role="tab"
          className={`tab${vista === 'consolidado' ? ' active' : ''}`}
          aria-selected={vista === 'consolidado'}
          onClick={() => setVista('consolidado')}
        >
          Consolidado
        </button>
      </div>

      <p className="catalogo-tab-hint">
        {vista === 'consolidado'
          ? 'Volumes iguais na mesma linha: mesma quantidade e mesma dimensão. A quantidade é a de cada volume.'
          : 'Cada item sem volume e cada volume com saldo. O local é o código do mapa.'}
      </p>

      <div className="card">
        {loading ? (
          <div className="loading">Carregando…</div>
        ) : listaVazia ? (
          <div className="empty-state">
            {filtroAtivo
              ? 'Nenhum item nesta posição com o filtro atual.'
              : 'Sem saldo. Receba uma OC para gerar a primeira entrada.'}
          </div>
        ) : vista === 'consolidado' ? (
          <EstoqueConsolidadoPanel saldos={saldos} q={q} familia={familia} />
        ) : (
          <EstoquePosicaoPanel
            itens={posicaoVisivel}
            podeRastreio={hasPermission('producao.ler') || hasPermission('estoque.ler')}
            situacao={validadeFiltro}
          />
        )}
      </div>
    </div>
  );
}
