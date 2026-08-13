import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OrcamentoPropostaView } from '../components/OrcamentoPropostaView';
import { PageHeader } from '../components/PageHeader';
import { api, type OrcamentoPropostaPublica } from '../lib/api';
import { BRAND } from '../lib/brand';

/**
 * Prévia interna da proposta comercial.
 * Mesma visão do cliente, sem aprovar/recusar e sem consumir o link `/p/:token`.
 */
export function OrcamentoPropostaPreviewPage() {
  const { id } = useParams();
  const [proposta, setProposta] = useState<OrcamentoPropostaPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [faixaIndex, setFaixaIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setErro(null);
      try {
        const res = await api.get<{ data: OrcamentoPropostaPublica }>(
          `/orcamentos/${id}/proposta-comercial`,
        );
        if (cancelled) return;
        setProposta(res.data);
        const first = res.data.faixas?.[0]?.index ?? 0;
        setFaixaIndex(first);
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof Error ? e.message : 'Falha ao carregar a prévia');
          setProposta(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const empresaNome = useMemo(() => {
    if (!proposta) return BRAND.licensee.logoAlt;
    return proposta.empresa.nome_fantasia || proposta.empresa.razao_social || BRAND.licensee.logoAlt;
  }, [proposta]);

  if (loading) {
    return <p className="loading">Carregando prévia…</p>;
  }

  if (!proposta) {
    return (
      <>
        <PageHeader title="Prévia da proposta" description="Indisponível" />
        {erro ? <p className="form-error">{erro}</p> : null}
        <Link to={id ? `/orcamentos/${id}` : '/orcamentos'} className="btn btn-secondary">
          Voltar ao orçamento
        </Link>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Prévia da proposta"
        description={`${proposta.codigo} · v${proposta.versao}`}
        actions={
          <Link to={`/orcamentos/${id}`} className="btn btn-secondary">
            Voltar ao orçamento
          </Link>
        }
      />
      <OrcamentoPropostaView
        proposta={proposta}
        empresaNome={empresaNome}
        somenteLeitura
        faixaIndex={faixaIndex}
        onFaixaChange={setFaixaIndex}
        kicker="Prévia interna"
        banner={
          <div className="orc-pub-banner orc-pub-banner--info">
            Prévia interna — sem aprovar ou recusar. A decisão do cliente ocorre somente pelo link
            pessoal enviado (WhatsApp/e-mail).
          </div>
        }
        erro={erro}
      />
    </>
  );
}
