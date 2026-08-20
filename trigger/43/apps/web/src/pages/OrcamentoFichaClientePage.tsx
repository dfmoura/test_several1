import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OrcamentoPropostaView } from '../components/OrcamentoPropostaView';
import { api, type OrcamentoPropostaPublica } from '../lib/api';
import { BRAND, brandDocumentTitle } from '../lib/brand';
import { voltarDaFicha } from '../lib/fichaNav';

/**
 * Ficha comercial do ORC — documento que o destinatário recebe.
 * Mesma visão de `OrcamentoPropostaView` (prévia e link público), em aba satélite
 * A4 retrato para imprimir / PDF. Sem aprovar/recusar (isso só no `/p/:token`).
 */
export function OrcamentoFichaClientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposta, setProposta] = useState<OrcamentoPropostaPublica | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const empresaNome = useMemo(() => {
    if (!proposta) return BRAND.licensee.logoAlt;
    return proposta.empresa.nome_fantasia || proposta.empresa.razao_social || BRAND.licensee.logoAlt;
  }, [proposta]);

  useEffect(() => {
    if (!id || id === 'novo') {
      setError('Orçamento inválido para a ficha do cliente.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: OrcamentoPropostaPublica }>(
          `/orcamentos/${id}/proposta-comercial`,
        );
        if (cancelled) return;
        setProposta(res.data);
      } catch {
        if (cancelled) return;
        setError('Proposta comercial não encontrada.');
        setProposta(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    document.body.classList.add('ficha-print-mode');
    return () => {
      document.body.classList.remove('ficha-print-mode');
    };
  }, []);

  useEffect(() => {
    if (!proposta) return;
    document.title = `Proposta ${proposta.codigo} · ${proposta.cliente_nome}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [proposta]);

  return (
    <div className="ficha-page ficha-page-proposta">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              voltarDaFicha(
                navigate,
                id && id !== 'novo' ? `/orcamentos/${id}` : '/orcamentos',
              )
            }
          >
            Voltar ao orçamento
          </button>
          <span className="ficha-toolbar-hint">
            A4 retrato · documento comercial (mesmo do destinatário) · Imprimir ou Salvar como
            PDF
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!proposta}
          onClick={() => window.print()}
        >
          Imprimir ficha
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando ficha do cliente…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {proposta && !loading ? (
        <OrcamentoPropostaView
          proposta={proposta}
          empresaNome={empresaNome}
          somenteLeitura
          faixaIndex={-1}
        />
      ) : null}
    </div>
  );
}
