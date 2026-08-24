import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  facaDesenhoFromSnapshot,
  OrcamentoFacaDesenho,
} from '../components/OrcamentoFacaDesenho';
import { ModelosComposicaoTable } from '../components/ModelosComposicaoTable';
import { OrcamentoResultado } from '../components/OrcamentoResultado';
import { PageHeader } from '../components/PageHeader';
import { RegistroMetaStrip } from '../components/RegistroMetaStrip';
import { StatusPill } from '../components/StatusPill';
import {
  ApiError,
  api,
  type Orcamento,
  type OrcamentoDestinatarioAprovacao,
  type OrcamentoEnvioAprovacao,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatDateTime, formatPhone } from '../lib/format';
import {
  displaySnap,
  isOrcEditavel,
  isOrcEnviavel,
  statusOrcPill,
} from '../lib/orcamentoForm';
import { tipoOperacaoFromSnap, tipoServicoLabel } from '../lib/operacoesSaida';
import { modoEntregaLabel, origemFreteLabel } from '../lib/orcamentoFrete';
import { especFromSnapshot } from '../lib/orcamentoGuiaProducao';

type ModeloCompSnap = { ordem?: number; nome?: string; percentual?: number };

export function OrcamentoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, produtoFlexorc } = useAuth();
  const canWrite = hasPermission('orcamento.escrever');

  const [orc, setOrc] = useState<Orcamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [envio, setEnvio] = useState<OrcamentoEnvioAprovacao | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [painelEnvio, setPainelEnvio] = useState(false);
  const [destinatarios, setDestinatarios] = useState<OrcamentoDestinatarioAprovacao[]>([]);
  const [avisoDest, setAvisoDest] = useState<string | null>(null);
  const [destSelecionado, setDestSelecionado] = useState<string>('');

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

  const destKey = (d: OrcamentoDestinatarioAprovacao) =>
    d.legado ? 'legado' : String(d.parceiro_contato_id);

  const abrirPainelEnvio = async () => {
    if (!orc || !canWrite) return;
    setPending(true);
    setErro(null);
    try {
      if (orc.aguardando_cliente) {
        await executarEnvio({});
        return;
      }
      const res = await api.get<{
        data: { destinatarios: OrcamentoDestinatarioAprovacao[]; aviso: string | null };
      }>(`/orcamentos/${orc.id}/destinatarios-aprovacao`);
      setDestinatarios(res.data.destinatarios);
      setAvisoDest(res.data.aviso);
      if (res.data.destinatarios.length === 0) {
        setErro(
          res.data.aviso ||
            'Cadastre no parceiro um contato autorizado a aprovar (WhatsApp ou e-mail).',
        );
        return;
      }
      setDestSelecionado(destKey(res.data.destinatarios[0]));
      setPainelEnvio(true);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao carregar destinatários');
    } finally {
      setPending(false);
    }
  };

  const executarEnvio = async (body: Record<string, unknown>) => {
    if (!orc) return;
    setPending(true);
    setErro(null);
    setCopiado(false);
    try {
      const res = await api.post<{ data: OrcamentoEnvioAprovacao }>(
        `/orcamentos/${orc.id}/enviar-aprovacao`,
        body,
      );
      setEnvio(res.data);
      setOrc(res.data.orcamento);
      setPainelEnvio(false);
      try {
        await navigator.clipboard.writeText(res.data.mensagem);
        setCopiado(true);
      } catch {
        // painel com texto
      }
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao gerar link de aprovação');
    } finally {
      setPending(false);
    }
  };

  const handleConfirmarEnvio = async () => {
    const d = destinatarios.find((x) => destKey(x) === destSelecionado);
    if (!d) {
      setErro('Selecione o contato que receberá o link.');
      return;
    }
    await executarEnvio(
      d.legado
        ? { usar_contato_legado: true }
        : { parceiro_contato_id: d.parceiro_contato_id },
    );
  };

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

  const handleCopiarDeNovo = async () => {
    if (!envio?.mensagem) return;
    try {
      await navigator.clipboard.writeText(envio.mensagem);
      setCopiado(true);
    } catch {
      setErro('Não foi possível copiar automaticamente — selecione o texto e use Ctrl+C.');
    }
  };

  const handleCopiarLinkAtivo = async () => {
    const url = orc?.link_aprovacao?.url;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      setErro('Não foi possível copiar o link — selecione e use Ctrl+C.');
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
  const condicaoSnap = String(input.condicao_pagamento ?? '').trim();
  const formaSnap = String(input.forma_pagamento ?? '').trim();
  const condicoesComerciaisSnap = [condicaoSnap, formaSnap].filter(Boolean).join(' · ');
  const modelosCompRaw = Array.isArray(input.modelos_composicao)
    ? (input.modelos_composicao as ModeloCompSnap[])
    : [];
  const modelosComp = modelosCompRaw.some((m) => String(m?.nome ?? '').trim() !== '')
    ? modelosCompRaw
    : [];

  const isServico = tipoOperacaoFromSnap(input) === 'SERVICO';
  const specTiles: Array<[string, unknown]> = isServico
    ? (
        [
          ['Tipo', tipoServicoLabel(String(input.tipo_servico ?? ''))],
          ['Descrição', input.descricao_servico],
          ['Unidade', input.unidade],
          ['Material do cliente', input.material_cliente ? 'Sim' : 'Não'],
          ['NFS-e (ISS)', input.codigo_tributacao_nacional_iss],
        ] as Array<[string, unknown]>
      ).filter((row): row is [string, unknown] => row[1] != null && row[1] !== '')
    : (
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
      ['Imposto %', input.imposto_pct],
      ['Troca produto', input.tipo_troca_produto],
      ['RPM', input.rpm],
    ] as Array<[string, unknown]>
  ).filter((row): row is [string, unknown] => row[1] != null && row[1] !== '');

  const lockNote = (() => {
    if (orc.status === 'APROVADO') {
      return 'Aprovado pelo destinatário do link — pronto para seguir (PED em entrega futura). Sem edição.';
    }
    if (orc.status === 'REPROVADO') {
      return 'Rejeitado pelo destinatário. Edite, recalcule e reenvie a um contato autorizado.';
    }
    if (orc.aguardando_cliente) {
      const dest = orc.link_aprovacao?.destino_nome;
      return dest
        ? `Aguardando aprovação de ${dest}. Não edita nem exclui. Use “Copiar link” para lembrete ao mesmo destinatário.`
        : 'Enviado para aprovação — não edita nem exclui. Use “Copiar link” para lembrete.';
    }
    if (editavel) {
      return 'Em preparação: pode editar, excluir ou enviar o link a um contato autorizado do cadastro.';
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
            <a
              href={`/orcamentos/${orc.id}/ficha-cliente`}
              className="btn btn-secondary"
              onClick={(e) => onAbrirFichaClick(e, `/orcamentos/${orc.id}/ficha-cliente`)}
            >
              Ficha do cliente
            </a>
            {enviavel ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={pending}
                onClick={() => void abrirPainelEnvio()}
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

      <RegistroMetaStrip registro={orc} />

      {erro ? <p className="form-error">{erro}</p> : null}

      {orc.aguardando_cliente && orc.link_aprovacao?.url && !envio ? (
        <div className="card orc-share-card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <h3 className="orc-section-title" style={{ marginTop: 0 }}>
              Link ativo
              {copiado ? <span className="orc-share-ok"> · copiado</span> : null}
            </h3>
            <p className="orc-share-hint">
              {orc.link_aprovacao.destino_nome
                ? `Enviado para ${orc.link_aprovacao.destino_nome}. `
                : ''}
              Use “Copiar link (lembrete)” para regenerar a mensagem completa ou copie só a URL abaixo.
            </p>
            <input
              className="orc-share-text"
              readOnly
              value={orc.link_aprovacao.url}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="btn-row" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void handleCopiarLinkAtivo()}
              >
                Copiar URL
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {painelEnvio ? (
        <div className="card orc-share-card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <h3 className="orc-section-title" style={{ marginTop: 0 }}>
              Quem recebe o link e pode decidir?
            </h3>
            <p className="orc-share-hint">
              O estudo exige contato oficial do cadastro (autorizado a aprovar). Não digite
              telefone/e-mail avulso — se mudou, atualize o parceiro antes.
            </p>
            {avisoDest ? <p className="orc-share-hint">{avisoDest}</p> : null}
            <div className="orc-pub-faixas" role="radiogroup" aria-label="Destinatários">
              {destinatarios.map((d) => {
                const key = destKey(d);
                const selected = destSelecionado === key;
                return (
                  <label
                    key={key}
                    className={`orc-pub-faixa${selected ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="destinatario"
                      checked={selected}
                      onChange={() => setDestSelecionado(key)}
                    />
                    <div>
                      <strong>
                        {d.nome}
                        {d.funcao ? ` · ${d.funcao}` : ''}
                        {d.autorizado_aprovar ? '' : ' (principal)'}
                      </strong>
                      <span>
                        {d.canal}
                        {d.whatsapp
                          ? ` · WhatsApp ${formatPhone(d.whatsapp) || d.whatsapp}`
                          : ''}
                        {d.email ? ` · ${d.email}` : ''}
                        {d.legado ? ' · dados do cadastro' : ''}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="btn-row" style={{ marginTop: '0.85rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={pending}
                onClick={() => void handleConfirmarEnvio()}
              >
                Gerar link e copiar mensagem
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={pending}
                onClick={() => setPainelEnvio(false)}
              >
                Cancelar
              </button>
              <Link
                to={`/parceiros/${orc.parceiro_id}`}
                className="btn btn-secondary"
              >
                Abrir cadastro do parceiro
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {envio ? (
        <div className="card orc-share-card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <h3 className="orc-section-title" style={{ marginTop: 0 }}>
              Mensagem para o destinatário
              {copiado ? <span className="orc-share-ok"> · texto copiado</span> : null}
            </h3>
            <p className="orc-share-hint">
              {envio.destinatario?.nome
                ? `Para ${envio.destinatario.nome}${envio.destinatario.funcao ? ` (${envio.destinatario.funcao})` : ''}${envio.destinatario.canal ? ` · ${envio.destinatario.canal}` : ''}. `
                : ''}
              {envio.zap_enviado && envio.zap_destino
                ? `WhatsApp enviado para ${formatPhone(envio.zap_destino) || envio.zap_destino}. `
                : envio.zap_motivo === 'sem_whatsapp_cadastro'
                  ? 'Contato sem WhatsApp no cadastro — use e-mail ou copie o texto. '
                  : envio.zap_motivo === 'falha_envio'
                    ? 'Não foi possível enviar o WhatsApp agora — use o canal abaixo. '
                    : ''}
              {envio.email_enviado && envio.email_destino
                ? `E-mail enviado para ${envio.email_destino}. `
                : envio.email_motivo === 'sem_email_cadastro'
                  ? 'Contato sem e-mail no cadastro — use WhatsApp ou copie o texto. '
                  : envio.email_motivo === 'falha_envio'
                    ? 'Não foi possível enviar o e-mail agora — use o canal abaixo. '
                    : ''}
              O link é pessoal e único — não encaminhe. Cole ou abra o canal abaixo; após
              aprovar/recusar o sistema atualiza sozinho e o link deixa de funcionar.
            </p>
            <textarea
              className="orc-share-text"
              readOnly
              rows={5}
              value={envio.mensagem}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="btn-row" style={{ marginTop: '0.75rem' }}>
              {envio.canal_url && envio.destinatario?.canal === 'WHATSAPP' ? (
                <a
                  className="btn btn-primary"
                  href={envio.canal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir WhatsApp
                </a>
              ) : null}
              {envio.canal_url && envio.destinatario?.canal === 'EMAIL' ? (
                <a className="btn btn-primary" href={envio.canal_url}>
                  Abrir e-mail
                </a>
              ) : null}
              <button
                type="button"
                className={envio.canal_url ? 'btn btn-secondary' : 'btn btn-primary'}
                onClick={() => void handleCopiarDeNovo()}
              >
                Copiar texto + link
              </button>
              <a
                className="btn btn-secondary"
                href={`/orcamentos/${orc.id}/ficha-cliente`}
                onClick={(e) =>
                  onAbrirFichaClick(e, `/orcamentos/${orc.id}/ficha-cliente`)
                }
              >
                Abrir proposta
              </a>
            </div>
            <p className="orc-share-hint" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
              “Abrir proposta” é prévia interna (sem aprovar/recusar). A decisão do cliente fica
              somente no link da mensagem acima.
            </p>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <div className="orc-detail-meta">
            <div>
              <span>Status</span>
              <strong>
                <StatusPill status={statusOrcPill(orc.status, orc.financeiro_status)} />
              </strong>
            </div>
            {produtoFlexorc.financeiro && orc.financeiro_status === 'AGUARDA_ADIANTAMENTO' ? (
              <div>
                <span>Financeiro</span>
                <strong>Aguardando pagamento (PIX)</strong>
              </div>
            ) : produtoFlexorc.financeiro && orc.financeiro_status === 'LIBERADO' ? (
              <div>
                <span>Financeiro</span>
                <strong>Liberado</strong>
              </div>
            ) : produtoFlexorc.financeiro && orc.financeiro_status ? (
              <div>
                <span>Financeiro</span>
                <strong>{orc.financeiro_status}</strong>
              </div>
            ) : null}
            <div>
              <span>Parceiro</span>
              <strong>
                {orc.parceiro?.codigo ?? '—'} — {orc.cliente_nome}
                {orc.parceiro?.is_prospect ? ' (prospect)' : ''}
                {orc.result_snapshot?.frete ? (
                  <span className="field-note">
                    {' '}
                    · {modoEntregaLabel(orc.result_snapshot.frete.modo)}
                    {origemFreteLabel(orc.result_snapshot.frete.origem)
                      ? ` · ${origemFreteLabel(orc.result_snapshot.frete.origem)?.toLowerCase()}`
                      : ''}
                  </span>
                ) : String(input.modo_entrega ?? '').toUpperCase() === 'ENTREGAR' ? (
                  <span className="field-note"> · Entregar</span>
                ) : (
                  <span className="field-note"> · Retirar no local</span>
                )}
              </strong>
            </div>
            {orc.vendedor ? (
              <div>
                <span>Vendedor</span>
                <strong>
                  {orc.vendedor.codigo} — {orc.vendedor.razao_social}
                </strong>
              </div>
            ) : null}
            <div>
              <span>Prazo / validade</span>
              <strong>
                {orc.prazo_entrega_dias} d.úteis · {orc.validade_dias} dias · ±
                {orc.tolerancia_qtd_pct}%
              </strong>
            </div>
            {condicoesComerciaisSnap ? (
              <div>
                <span>Condição / forma</span>
                <strong>{condicoesComerciaisSnap}</strong>
              </div>
            ) : null}
            {orc.link_aprovacao?.destino_nome ? (
              <div>
                <span>Destinatário do link</span>
                <strong>
                  {orc.link_aprovacao.destino_nome}
                  {orc.link_aprovacao.destino_funcao
                    ? ` · ${orc.link_aprovacao.destino_funcao}`
                    : ''}
                </strong>
              </div>
            ) : null}
            {orc.enviado_em ? (
              <div>
                <span>Enviado</span>
                <strong>{formatDateTime(orc.enviado_em)}</strong>
              </div>
            ) : null}
            {orc.visualizado_em || orc.link_aprovacao?.visualizacoes ? (
              <div>
                <span>Visualizado</span>
                <strong>
                  {orc.visualizado_em ? formatDateTime(orc.visualizado_em) : '—'}
                  {orc.link_aprovacao?.visualizacoes
                    ? ` · ${orc.link_aprovacao.visualizacoes}× no link`
                    : ''}
                </strong>
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
        </div>
      </div>

      <div className={`card${facaDesenho ? ' orc-faca-card' : ''}`} style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          {facaDesenho ? (
            <div className="orc-spec-faca">
              <OrcamentoFacaDesenho {...facaDesenho} variant="featured" />
            </div>
          ) : null}
          <h3 className="orc-section-title" style={{ marginTop: facaDesenho ? '1rem' : 0 }}>
            Especificação
          </h3>
          <div className="orc-spec-grid">
            {specTiles.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{displaySnap(value)}</strong>
              </div>
            ))}
          </div>
          {modelosComp.length > 0 ? (
            <ModelosComposicaoTable
              variant="data"
              className="orc-modelos-detalhe-page"
              hint={null}
              modelos={modelosComp}
              faixas={(orc.result_snapshot?.faixas ?? []).map((fx, i) => ({
                key: i,
                quantidade: Number(fx.quantidade) || 0,
              }))}
            />
          ) : null}
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
          modoServico={isServico}
          echoEspecificacao={false}
          guiaEspec={isServico ? null : especFromSnapshot(orc.input_snapshot)}
          modelosComposicao={
            isServico
              ? null
              : modelosComp.map((m, i) => ({
                  ordem: Number(m.ordem) || i + 1,
                  nome: String(m.nome ?? ''),
                  percentual: Number(m.percentual) || 0,
                }))
          }
        />
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>Sem resultado calculado.</p>
      )}
    </>
  );
}
