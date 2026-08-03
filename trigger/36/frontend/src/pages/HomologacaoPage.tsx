import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { homologacaoApi, getErrorMessage } from '../lib/api';
import { ETAPAS } from '../lib/stages';
import type { ApiRow, CriterioHomologacao } from '../types';

const STATUS_OPCOES = ['PENDENTE', 'PASS', 'FAIL', 'NA'] as const;

export function HomologacaoPage() {
  const etapa = ETAPAS[9];
  const [criterios, setCriterios] = useState<CriterioHomologacao[]>([]);
  const [goNogo, setGoNogo] = useState<ApiRow | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function carregar() {
    try {
      const [c, g] = await Promise.all([homologacaoApi.criterios(), homologacaoApi.goNogo()]);
      setCriterios(c as CriterioHomologacao[]);
      setGoNogo(g as ApiRow);
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function atualizar(id: string, status: string, evidencias: string) {
    setPending(id);
    setErro(null);
    try {
      await homologacaoApi.atualizar(id, { status, evidencias: evidencias || undefined });
      await carregar();
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(null);
    }
  }

  function itemClass(status: string) {
    if (status === 'PASS' || status === 'NA') return 'pass';
    if (status === 'FAIL') return 'fail';
    return 'pendente';
  }

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

      {goNogo ? (
        <section
          className="panel"
          style={{
            borderLeft: `4px solid ${goNogo.decisao === 'GO' ? 'var(--ok)' : 'var(--danger)'}`,
          }}
        >
          <h2 className="panel-title">Go / No-Go — Gate S1</h2>
          <p>
            Decisão: <strong>{String(goNogo.decisao)}</strong>
          </p>
          {Array.isArray(goNogo.fails) && (goNogo.fails as string[]).length > 0 ? (
            <p className="error">Falhas: {(goNogo.fails as string[]).join(', ')}</p>
          ) : null}
          {Array.isArray(goNogo.pending) && (goNogo.pending as string[]).length > 0 ? (
            <p className="muted">Pendentes: {(goNogo.pending as string[]).join(', ')}</p>
          ) : null}
          <p className="muted">{String(goNogo.nota ?? '')}</p>
          <p className="muted">CA-07 (lab): {String(goNogo.ca07_status)}</p>
          <div className="btn-row" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="btn primary"
              disabled={pending === 'seed'}
              onClick={async () => {
                setPending('seed');
                setErro(null);
                try {
                  const r = await homologacaoApi.seedJornada();
                  await carregar();
                  alert(JSON.stringify(r, null, 2));
                } catch (e) {
                  setErro(getErrorMessage(e));
                } finally {
                  setPending(null);
                }
              }}
            >
              Popular jornada demo (se vazio)
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <h2 className="panel-title">Critérios CA-01…CA-12</h2>
        <div className="hml-board">
          {criterios.map((c) => (
            <article key={c.id} className={`hml-item ${itemClass(c.status)}`}>
              <div>
                <strong>{c.id}</strong>
                <div>{c.titulo}</div>
                {c.etapa ? (
                  <div className="roteiros">
                    <span className="roteiro-tag">{c.etapa}</span>
                    {c.script ? <span className="roteiro-tag">{c.script}</span> : null}
                  </div>
                ) : null}
              </div>
              <div>
                <label>
                  Evidências
                  <textarea
                    rows={3}
                    defaultValue={String(c.evidencias ?? '')}
                    id={`ev-${c.id}`}
                    placeholder="Descreva evidência, print, roteiro executado…"
                  />
                </label>
              </div>
              <div>
                <div className="toggle-group">
                  {STATUS_OPCOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`btn sm${c.status === s ? ' active' : ''}`}
                      disabled={pending === c.id}
                      onClick={() => {
                        const el = document.getElementById(`ev-${c.id}`) as HTMLTextAreaElement | null;
                        atualizar(c.id, s, el?.value ?? '');
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
