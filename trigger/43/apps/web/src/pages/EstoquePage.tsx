import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { EstoquePosicaoPanel } from '../components/EstoquePosicaoPanel';
import { PageHeader } from '../components/PageHeader';
import { api, type EstoqueLote, type EstoqueSaldo } from '../lib/api';
import {
  familiasNaPosicao,
  itensPosicao,
  linhaTemStatus,
  somaValorPosicao,
} from '../lib/estoqueUi';
import { familiaLabel } from '../lib/format';
import { useAuth } from '../lib/auth';

function loteComSaldo(lote: EstoqueLote): boolean {
  return Number(lote.qtde) > 0;
}

export function EstoquePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const [saldos, setSaldos] = useState<EstoqueSaldo[]>([]);
  const [q, setQ] = useState('');
  const [validadeFiltro, setValidadeFiltro] = useState('');
  const [familia, setFamilia] = useState(() => searchParams.get('familia') ?? '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!searchParams.has('tab') && !searchParams.has('grupo')) return;
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('tab');
        p.delete('grupo');
        return p;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

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
    setValidadeFiltro((prev) => (prev === status ? '' : status));
  };

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
              aria-pressed={validadeFiltro === 'VENCIDO'}
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
              aria-pressed={validadeFiltro === 'A_VENCER'}
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

      <p className="catalogo-tab-hint">
        Cada item sem volume e cada volume com saldo. O local é o código do mapa.
      </p>

      <div className="card estoque-filtros-card">
        <div className="card-body">
          <div className="form-grid" style={{ alignItems: 'end' }}>
            <div className="form-group span-2">
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Produto, dimensão, local…"
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
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Carregando…</div>
        ) : posicaoVisivel.length === 0 ? (
          <div className="empty-state">
            {q || familia || validadeFiltro
              ? 'Nenhum item nesta posição com o filtro atual.'
              : 'Sem saldo. Receba uma OC para gerar a primeira entrada.'}
          </div>
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
