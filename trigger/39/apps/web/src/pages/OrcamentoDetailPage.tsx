import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  facaDesenhoFromSnapshot,
  OrcamentoFacaDesenho,
} from '../components/OrcamentoFacaDesenho';
import { OrcamentoResultado } from '../components/OrcamentoResultado';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import {
  ApiError,
  api,
  type Orcamento,
  type OrcamentoEnvioAprovacao,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatCurrency, formatDateTime } from '../lib/format';
import {
  displaySnap,
  isOrcEditavel,
  isOrcEnviavel,
  statusOrcLabel,
  statusOrcPill,
} from '../lib/orcamentoForm';

export function OrcamentoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('orcamento.escrever');

  const [orc, setOrc] = useState<Orcamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [envio, setEnvio] = useState<OrcamentoEnvioAprovacao | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const res = await api.get<{ data: Orcamento }>(`/orcamentos/${id}`);
        if (!cancelled) setOrc(res.data);
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof Error ? e.message : 'Falha ao carregar orçamento');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleExcluir = async () => {
    if (!orc || !canWrite || !isOrcEditavel(orc.status)) return;
    if (!window.confirm(`Excluir logicamente ${orc.codigo}? Cancela o rascunho (sem delete físico).`)) {
      return;
    }
    setPending(true);
    setErro(null);
    try {
      await api.delete(`/orcamentos/${orc.id}`);
      navigate('/orcamentos');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao excluir');
    } finally {
      setPending(false);
    }
  };

  const handleEnviar = async () => {
    if (!orc || !canWrite || !(orc.enviavel ?? isOrcEnviavel(orc.status))) return;
    setPending(true);
    setErro(null);
    setCopiado(false);
    try {
      const res = await api.post<{ data: OrcamentoEnvioAprovacao }>(
        `/orcamentos/${orc.id}/enviar-aprovacao`,
      );
      setEnvio(res.data);
      setOrc(res.data.orcamento);
      try {
        await navigator.clipboard.writeText(res.data.mensagem);
        setCopiado(true);
      } catch {
        // fallback: painel com texto para Ctrl+C manual
      }
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao gerar link de aprovação');
    } finally {
      setPending(false);
    }
  };

  const handleCopiarDeNovo = async () => {
    if (!envio?.mensagem) return;
    try {
      await navigator.clipboard.writeText(envio.mensagem);
      setCopiado(true);
    } catch {
      setErro('Não foi possível copiar automaticamente — selecione o texto e use Ctrl+C.');
    }
  };

  if (loading) return <p className="loading">Carregando…</p>;
  if (!orc) {
    return (
      <>
        <PageHeader title="Orçamento" description="Não encontrado" />
        {erro ? <p className="form-error">{erro}</p> : null}
        <Link to="/orcamentos" className="btn btn-secondary">
          Voltar à lista
        </Link>
      </>
    );
  }

  const editavel = isOrcEditavel(orc.status) && orc.editavel;
  const enviavel = (orc.enviavel ?? isOrcEnviavel(orc.status)) && canWrite;
  const input = orc.input_snapshot ?? {};
  const facaDesenho = facaDesenhoFromSnapshot(input);

  const specTiles: Array<[string, unknown]> = (
    [
      ['Cores', input.cores],
      ['Papel', input.papel],
      ['Acabamento', input.acabamento],
      ['Modelos', input.modelos],
      ['Colunas', input.colunas],
      ['Etiq./rolo', input.etiq_por_rolo],
      ['Tubete', input.tubete],
      ['Col. rebob.', input.coluna_rebobinacao],
      ['Matriz', input.matriz],
      ['Valor faca nova', input.faca_nova ? input.valor_faca_nova : null],
      ['Prazo faca (d)', input.faca_nova ? input.prazo_faca_dias : null],
      ['Imposto %', input.imposto_pct],
      ['Troca produto', input.tipo_troca_produto],
      ['RPM', input.rpm],
    ] as Array<[string, unknown]>
  ).filter((row): row is [string, unknown] => row[1] != null && row[1] !== '');

  const lockNote = (() => {
    if (orc.status === 'APROVADO') {
      return 'Aprovado pelo cliente — pronto para seguir (PED em entrega futura). Sem edição.';
    }
    if (orc.status === 'REPROVADO') {
      return 'Rejeitado pelo cliente. Edite, recalcule e reenvie um novo link.';
    }
    if (orc.aguardando_cliente) {
      return 'Enviado para aprovação — não edita nem exclui. Use “Copiar link” para lembrete.';
    }
    if (editavel) {
      return 'Em preparação: pode editar, excluir ou enviar para aprovação do cliente.';
    }
    return 'Snapshot travado neste status.';
  })();

  return (
    <>
      <PageHeader
        title={orc.codigo}
        description={`${orc.cliente_nome} · v${orc.versao}`}
        actions={
          <div className="btn-row">
            <Link to="/orcamentos" className="btn btn-secondary">
              Lista
            </Link>
            <a
              href={`/orcamentos/${orc.id}/ficha`}
              className="btn btn-secondary"
              onClick={(e) => onAbrirFichaClick(e, `/orcamentos/${orc.id}/ficha`)}
            >
              Imprimir ficha
            </a>
            <Link to="/orcamentos/como-calcula" className="btn btn-secondary">
              Como calcula
            </Link>
            {enviavel ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={pending}
                onClick={() => void handleEnviar()}
              >
                {orc.aguardando_cliente ? 'Copiar link (lembrete)' : 'Enviar p/ aprovação'}
              </button>
            ) : null}
            {canWrite && editavel ? (
              <>
                <Link to={`/orcamentos/${orc.id}/editar`} className="btn btn-secondary">
                  Editar
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={pending}
                  onClick={() => void handleExcluir()}
                >
                  Excluir
                </button>
              </>
            ) : null}
          </div>
        }
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      {envio ? (
        <div className="card orc-share-card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <h3 className="orc-section-title" style={{ marginTop: 0 }}>
              Link para o cliente
              {copiado ? <span className="orc-share-ok"> · texto copiado</span> : null}
            </h3>
            <p className="orc-share-hint">
              Cole no WhatsApp ou e-mail (Ctrl+V). O cliente abre o link, vê a proposta e
              aprova ou recusa. Depois da decisão o link deixa de funcionar.
            </p>
            <textarea
              className="orc-share-text"
              readOnly
              rows={5}
              value={envio.mensagem}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="btn-row" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleCopiarDeNovo()}
              >
                Copiar texto + link
              </button>
              <a
                className="btn btn-secondary"
                href={envio.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir proposta
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <div className="orc-detail-meta">
            <div>
              <span>Status</span>
              <strong>
                <StatusPill status={statusOrcPill(orc.status)} />
              </strong>
            </div>
            <div>
              <span>Parceiro</span>
              <strong>
                {orc.parceiro?.codigo ?? '—'} — {orc.cliente_nome}
                {orc.parceiro?.is_prospect ? ' (prospect)' : ''}
              </strong>
            </div>
            <div>
              <span>Versão</span>
              <strong>v{orc.versao}</strong>
            </div>
            <div>
              <span>Matriz</span>
              <strong>
                {orc.cobra_matriz ? formatCurrency(orc.valor_matriz) : 'Isenta'}
                {(() => {
                  const snap = orc.result_snapshot?.catalog_snapshot?.matriz_cm2;
                  const tarifa =
                    typeof snap === 'number'
                      ? snap
                      : typeof snap === 'string' && snap !== ''
                        ? Number(snap)
                        : null;
                  return tarifa != null && Number.isFinite(tarifa)
                    ? ` · ${Number(tarifa).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}/cm²`
                    : '';
                })()}
              </strong>
            </div>
            <div>
              <span>Prazo / validade</span>
              <strong>
                {orc.prazo_entrega_dias} d.úteis · {orc.validade_dias} dias · ±
                {orc.tolerancia_qtd_pct}%
              </strong>
            </div>
            <div>
              <span>Atualizado</span>
              <strong>{formatDateTime(orc.updated_at)}</strong>
            </div>
            {orc.enviado_em ? (
              <div>
                <span>Enviado</span>
                <strong>{formatDateTime(orc.enviado_em)}</strong>
              </div>
            ) : null}
            {orc.visualizado_em ? (
              <div>
                <span>Visualizado</span>
                <strong>{formatDateTime(orc.visualizado_em)}</strong>
              </div>
            ) : null}
            {orc.decidido_em ? (
              <div>
                <span>Decisão</span>
                <strong>
                  {formatDateTime(orc.decidido_em)}
                  {orc.aceite_nome_cliente ? ` · ${orc.aceite_nome_cliente}` : ''}
                  {orc.aceite_faixa_index != null ? ` · faixa #${orc.aceite_faixa_index + 1}` : ''}
                </strong>
              </div>
            ) : null}
          </div>

          {orc.motivo_decisao && orc.status === 'REPROVADO' ? (
            <p style={{ marginTop: '0.75rem', marginBottom: 0 }}>
              <strong>Motivo da recusa:</strong> {orc.motivo_decisao}
            </p>
          ) : null}

          <p className="orc-lock-note">{lockNote}</p>
          <p className="orc-lock-note" style={{ marginTop: '0.35rem' }}>
            Situação: <strong>{statusOrcLabel(orc.status)}</strong>
            {orc.link_aprovacao?.visualizacoes
              ? ` · ${orc.link_aprovacao.visualizacoes} visualização(ões) do link`
              : ''}
          </p>
        </div>
      </div>

      {facaDesenho ? (
        <div className="card orc-faca-card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <OrcamentoFacaDesenho {...facaDesenho} variant="featured" />
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <h3 className="orc-section-title" style={{ marginTop: 0 }}>
            Especificação (snapshot)
          </h3>
          <div className="orc-spec-grid">
            {specTiles.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{displaySnap(value)}</strong>
              </div>
            ))}
          </div>
          {orc.observacao ? (
            <p style={{ marginBottom: 0, marginTop: '0.85rem' }}>
              <strong>Obs. interna:</strong> {orc.observacao}
            </p>
          ) : null}
        </div>
      </div>

      {orc.result_snapshot ? (
        <OrcamentoResultado
          calculo={orc.result_snapshot}
          prazoEntregaDias={orc.prazo_entrega_dias}
          validadeDias={orc.validade_dias}
          toleranciaQtdPct={orc.tolerancia_qtd_pct}
          facaDesenho={facaDesenho}
        />
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>Sem resultado calculado.</p>
      )}
    </>
  );
}
