import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { CreditoChip, DocStatusChip } from '../components/StatusChip';
import { formatMoney, getErrorMessage, pedidosApi } from '../lib/api';
import { ETAPAS } from '../lib/stages';
import type { ApiRow } from '../types';

type Verificacao = {
  libera_automatico?: boolean;
  requer_justificativa?: boolean;
  alcada?: string;
  motivos?: string[];
  analise?: {
    situacao?: string;
    limite?: string | number;
    exposicao?: string | number;
    saldo_disponivel?: string | number;
    atraso_max_dias?: number;
  };
};

export function PedidosPage() {
  const etapa = ETAPAS[3];
  const [lista, setLista] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [liberarId, setLiberarId] = useState<number | null>(null);
  const [modoLib, setModoLib] = useState<'credito' | 'adiantamento'>('credito');
  const [justificativa, setJustificativa] = useState('');
  const [verifSel, setVerifSel] = useState<Verificacao | null>(null);

  async function carregar() {
    try {
      const rows = await pedidosApi.list();
      setLista(rows as ApiRow[]);
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function acao(fn: () => Promise<unknown>) {
    setPending(true);
    setErro(null);
    try {
      await fn();
      await carregar();
      setLiberarId(null);
      setJustificativa('');
      setVerifSel(null);
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  function abrirLiberar(p: ApiRow, modo: 'credito' | 'adiantamento') {
    setLiberarId(p.id as number);
    setModoLib(modo);
    setJustificativa('');
    setVerifSel((p.verificacao_credito as Verificacao) ?? null);
    setErro(null);
  }

  function confirmarLiberar() {
    if (liberarId == null) return;
    const precisa =
      modoLib === 'credito' && Boolean(verifSel?.requer_justificativa);
    if (precisa && justificativa.trim().length < 15) {
      setErro('Justificativa obrigatória na liberação excepcional (mín. 15 caracteres).');
      return;
    }
    acao(() =>
      pedidosApi.liberar(liberarId, modoLib, justificativa.trim() || undefined),
    );
  }

  function renderAcoes(p: ApiRow) {
    const status = String(p.status);
    const id = p.id as number;
    const btns: JSX.Element[] = [];

    if (status === 'AGUARDA_CREDITO' || status === 'NOVO') {
      btns.push(
        <button
          key="cred"
          type="button"
          className="btn sm primary"
          disabled={pending}
          onClick={() => abrirLiberar(p, 'credito')}
        >
          Liberar crédito
        </button>,
      );
    }
    if (status === 'AGUARDA_ADIANTAMENTO' || status === 'NOVO' || status === 'AGUARDA_CREDITO') {
      btns.push(
        <button
          key="ad"
          type="button"
          className="btn sm"
          disabled={pending}
          onClick={() => abrirLiberar(p, 'adiantamento')}
        >
          Liberar adiantamento
        </button>,
      );
    }
    if (status === 'LIBERADO') {
      btns.push(
        <button
          key="prod"
          type="button"
          className="btn sm primary"
          disabled={pending}
          onClick={() => acao(() => pedidosApi.iniciarProducao(id))}
        >
          Iniciar produção
        </button>,
      );
    }
    if (status === 'EM_PRODUCAO' || status === 'EM_SEPARACAO') {
      btns.push(
        <button
          key="fat"
          type="button"
          className="btn sm primary"
          disabled={pending}
          onClick={() => acao(() => pedidosApi.faturar(id, 'NFSE'))}
        >
          Faturar
        </button>,
      );
    }
    if (status === 'FATURADO' || status === 'FATURADO_PARCIAL') {
      btns.push(
        <button
          key="ent"
          type="button"
          className="btn sm primary"
          disabled={pending}
          onClick={() => acao(() => pedidosApi.entregar(id))}
        >
          Entregar
        </button>,
      );
    }

    return btns.length ? <div className="btn-row">{btns}</div> : <span className="muted">—</span>;
  }

  const pedLib = lista.find((p) => p.id === liberarId);

  return (
    <>
      <PageHeader
        ordem={etapa.ordem}
        codigo={etapa.codigo}
        titulo={etapa.titulo}
        modo={etapa.modo}
        regra={etapa.regra}
      />

      {erro ? <p className="error">{erro}</p> : null}

      <section className="panel">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Crédito</th>
              <th>Valor total</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => {
              const cred = p.credito as { situacao?: string; saldo_disponivel?: string | number } | undefined;
              const ver = p.verificacao_credito as Verificacao | undefined;
              return (
                <tr key={String(p.id)}>
                  <td>{String(p.codigo)}</td>
                  <td>{String(p.cliente_nome)}</td>
                  <td>
                    <DocStatusChip status={String(p.status)} />
                  </td>
                  <td>
                    {cred?.situacao ? (
                      <div className="credito-cell">
                        <CreditoChip situacao={String(cred.situacao)} />
                        <span className="muted" style={{ fontSize: '0.78rem' }}>
                          disp. {formatMoney(cred.saldo_disponivel)}
                          {ver?.requer_justificativa ? ' · exceção' : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{formatMoney(p.valor_total as string | number)}</td>
                  <td>{renderAcoes(p)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {liberarId != null && pedLib ? (
        <div className="modal-backdrop" onClick={() => setLiberarId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modoLib === 'credito' ? 'Liberar crédito' : 'Liberar adiantamento'} —{' '}
                {String(pedLib.codigo)}
              </h2>
              <button type="button" className="btn ghost sm" onClick={() => setLiberarId(null)}>
                Fechar
              </button>
            </div>

            {modoLib === 'credito' && verifSel ? (
              <div className="credito-box">
                <div className="btn-row" style={{ marginBottom: '0.5rem' }}>
                  <CreditoChip situacao={String(verifSel.analise?.situacao ?? 'NORMAL')} />
                  <span className="chip">
                    {verifSel.libera_automatico ? 'Automática' : `Alçada ${verifSel.alcada}`}
                  </span>
                </div>
                <p className="muted" style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
                  Limite {formatMoney(verifSel.analise?.limite)} · Exposição{' '}
                  {formatMoney(verifSel.analise?.exposicao)} · Saldo{' '}
                  {formatMoney(verifSel.analise?.saldo_disponivel)}
                  {verifSel.analise?.atraso_max_dias
                    ? ` · Atraso máx. ${verifSel.analise.atraso_max_dias}d`
                    : ''}
                </p>
                <ul className="credito-motivos">
                  {(verifSel.motivos ?? []).map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {modoLib === 'adiantamento' ? (
              <p className="muted" style={{ fontSize: '0.9rem' }}>
                Adiantamento/sinal não consome limite — venda sem risco de crédito.
              </p>
            ) : null}

            {(modoLib === 'adiantamento' || verifSel?.requer_justificativa) && (
              <label style={{ display: 'block', marginTop: '0.75rem' }}>
                Justificativa{modoLib === 'credito' && verifSel?.requer_justificativa ? ' *' : ''}
                <textarea
                  rows={3}
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder={
                    modoLib === 'credito'
                      ? 'Motivo da exceção (obrigatório quando fora da política)…'
                      : 'Opcional — referência do sinal/comprovante…'
                  }
                />
              </label>
            )}

            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn primary" disabled={pending} onClick={confirmarLiberar}>
                Confirmar liberação
              </button>
              <button type="button" className="btn ghost" onClick={() => setLiberarId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
