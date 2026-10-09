import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import {
  identidadeParteComercial,
  metaLinhasParteComercial,
} from './OrcPubParteComercial';
import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
import { RastreioFichaSection } from './RastreioInsumosFichaSheet';
import { PedidoItemFichaProducao } from './PedidoFichaSheet';
import { SaidaEtiquetaBadge } from './SaidaEtiquetaBadge';
import { ModeloTintasPorModelo } from './ModeloTintasTags';
import type { OrdemProducao, Pedido } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatDateTime, formatDecimalBr } from '../lib/format';
import { formatEnderecoParceiro } from '../lib/pedidoConfirmacao';
import { prazoEntregaCompleto } from '../lib/prazoEntrega';
import { formatQuantoFicha } from '../lib/producaoPick';
import {
  opKitEstado,
  opKitEstadoLabel,
  opKitNome,
  opKitOnde,
  opStatusLabel,
} from '../lib/producaoUi';
import { dash, faixaDoItem, formatDateTimeBr, opChipClass, specOperacional } from '../lib/producaoFicha';
import { descricaoFromPedidoSpec } from '../lib/orcamentoPropostaItens';
import {
  artesDaOrdem,
  corridaFisica,
  textoBobinaFlexo,
  textoColunaRebobinacao,
  textoFacaFlexo,
  textoMaquinaFlexo,
} from '../lib/opFichaFlexo';
import { saidaEtiquetaLabel } from '../lib/saidaEtiqueta';

/**
 * Ficha impressa da OP — ordem de flexo.
 * Formulário do item do pedido, sem preço. Quanto rodar e material em seguida.
 */
export type OrdemProducaoFichaSheetProps = {
  ordem: OrdemProducao;
  pedido: Pedido | null;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

function qtdeTxt(value: number | null, suffix: string, digits = 0): string {
  if (value == null) return '—';
  return `${formatDecimalBr(value, digits)} ${suffix}`;
}

/** Descrição oficial do item, em partes que não quebram no meio. */
function tituloProduto(produto: string | null) {
  if (!produto) return 'Ordem de produção';
  const partes = produto
    .split(/\s*·\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (partes.length < 2) return produto;
  return (
    <span className="ficha-op-titulo">
      {partes.map((parte, i) => (
        <span key={`${i}-${parte}`} className="ficha-op-titulo-parte">
          {parte}
        </span>
      ))}
    </span>
  );
}

export function OrdemProducaoFichaSheet({
  ordem: o,
  pedido,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: OrdemProducaoFichaSheetProps) {
  const item =
    pedido?.itens.find((i) => i.id === o.pedido_item?.id) ?? pedido?.itens[0] ?? null;
  const spec = pedido && item ? specOperacional(pedido, item) : {};
  const desc = descricaoFromPedidoSpec(spec);
  const materiais = o.materiais ?? [];
  const tol = o.pedido?.tolerancia_qtd_pct ?? pedido?.tolerancia_qtd_pct ?? '20';
  const pedCodigo = o.pedido?.codigo ?? pedido?.codigo ?? '—';
  const parceiro = pedido?.parceiro ?? o.parceiro ?? null;
  const cliente = identidadeParteComercial(parceiro, parceiro?.razao_social ?? '—');
  const clienteCodigo = (parceiro?.codigo ?? '').trim();
  const clienteLead = clienteCodigo
    ? `${clienteCodigo} — ${cliente.display}`
    : cliente.display;
  const clienteMeta = [
    ...metaLinhasParteComercial(parceiro, { showCodigo: false, showDocumento: false }),
    formatEnderecoParceiro(pedido?.parceiro) ?? '',
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' · ');
  const qtdePlanejada = formatDecimalBr(Number(o.qtde_planejada), 0);
  const produto =
    (o.pedido_item?.descricao ?? item?.descricao ?? '').trim() || null;
  const maquina = textoMaquinaFlexo(spec);
  const bobina = textoBobinaFlexo(spec);
  const colunasN = Number(spec.colunas);
  const colunasTxt =
    Number.isFinite(colunasN) && colunasN >= 1 ? formatDecimalBr(Math.round(colunasN), 0) : null;
  const faca = textoFacaFlexo(spec);
  const colunaReb = textoColunaRebobinacao(spec);
  const saida = String(spec.saida_etiqueta ?? desc.saida_etiqueta ?? '');
  const saidaOk = Boolean(saidaEtiquetaLabel(saida));
  const faixa = faixaDoItem(pedido, item);
  const corrida = corridaFisica(faixa);
  const qtdeArte = corrida?.etiquetas ?? (Number(o.qtde_planejada) || 0);
  const artes = artesDaOrdem(spec, qtdeArte);
  const tintas = desc.modelos_composicao;
  const temImpressao = Boolean(
      desc.papel ||
      desc.medida ||
      colunasTxt ||
      bobina ||
      faca ||
      saidaOk ||
      desc.cores ||
      desc.acabamento ||
      desc.tubete ||
      desc.etiq_por_rolo != null ||
      colunaReb ||
      (tintas && tintas.length > 0) ||
      artes.length > 0,
  );

  return (
    <article
      className="ficha-sheet ped-ficha ficha-sheet-op"
      aria-label={`Ficha da ordem ${o.codigo}`}
    >
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Ordem de produção · flexografia</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{o.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{tituloProduto(produto)}</h2>
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip ${opChipClass(o.status)}`.trim()}>
            {opStatusLabel(o.status)}
          </span>
          <span className="ficha-chip">{qtdePlanejada} etiquetas</span>
          {maquina ? <span className="ficha-chip ficha-op-maquina">{maquina}</span> : null}
          {pedido?.prazo_entrega_dias != null ? (
            <span className="ficha-chip ficha-chip-muted">{prazoEntregaCompleto(pedido)}</span>
          ) : null}
          <span className="ficha-chip ficha-chip-muted">Tol. ±{tol}%</span>
        </div>
      </div>

      <section className="ficha-party">
        <h3>Cliente</h3>
        <p className="ficha-party-lead">{clienteLead}</p>
        <p className="ficha-party-meta">{clienteMeta || '—'}</p>
      </section>

      <div className="ficha-kv-strip">
        <FichaKv label="Pedido" value={pedCodigo} />
        <FichaKv label="Aberta" value={formatDateTime(o.created_at)} />
        {o.iniciada_em ? <FichaKv label="Iniciada" value={formatDateTime(o.iniciada_em)} /> : null}
        {o.concluida_em ? (
          <FichaKv label="Concluída" value={formatDateTime(o.concluida_em)} />
        ) : null}
      </div>

      {pedido && item && item.necessidade === 'PRODUCAO' ? (
        <FichaSection title="Etiqueta">
          <PedidoItemFichaProducao pedido={pedido} item={item} />
          {colunaReb ? (
            <p className="ficha-inline-list">
              <strong>Rebobinação</strong>
              {colunaReb}
            </p>
          ) : null}
        </FichaSection>
      ) : (
      <FichaSection title="Impressão">
        {!temImpressao ? (
          <p className="ficha-empty">
            {produto ?? o.pedido_item?.descricao ?? 'Especificação indisponível nesta ficha.'}
          </p>
        ) : (
          <>
            <div className="ficha-kv-grid cols-4">
              {desc.papel ? <FichaKv label="Substrato" value={desc.papel} wide /> : null}
              {desc.medida ? <FichaKv label="Medida" value={desc.medida} /> : null}
              {colunasTxt ? <FichaKv label="Colunas" value={colunasTxt} /> : null}
              {bobina ? <FichaKv label="Bobina" value={bobina} wide /> : null}
              {faca ? <FichaKv label="Faca" value={faca} wide /> : null}
              {desc.cores ? <FichaKv label="Cores" value={String(desc.cores)} /> : null}
              {desc.acabamento ? <FichaKv label="Acabamento" value={desc.acabamento} /> : null}
              {desc.tubete ? <FichaKv label="Tubete" value={desc.tubete} /> : null}
              {desc.etiq_por_rolo != null ? (
                <FichaKv
                  label="Etiq./rolo"
                  value={Number(desc.etiq_por_rolo).toLocaleString('pt-BR')}
                />
              ) : null}
              {colunaReb ? <FichaKv label="Rebobinação" value={colunaReb} /> : null}
              {saidaOk ? (
                <FichaKv
                  label="Saída"
                  value={<SaidaEtiquetaBadge code={saida} variant="dense" />}
                />
              ) : null}
              {tintas && tintas.length > 0 ? (
                <FichaKv
                  label="Cores da arte"
                  value={<ModeloTintasPorModelo modelos={tintas} />}
                  wide
                />
              ) : null}
            </div>
            {artes.length > 0 ? (
              <p className="ficha-inline-list">
                <strong>Artes</strong>
                {artes
                  .map((arte) =>
                    arte.qtde != null
                      ? `${arte.nome} ${formatDecimalBr(arte.qtde, 0)}`
                      : arte.nome,
                  )
                  .join(' · ')}
              </p>
            ) : null}
          </>
        )}
      </FichaSection>
      )}

      {corrida ? (
        <FichaSection title="Quanto rodar">
          <div className="ficha-op-corrida">
            {corrida.etiquetas != null ? (
              <FichaKv label="Etiquetas" value={formatDecimalBr(corrida.etiquetas, 0)} />
            ) : null}
            {corrida.metros != null ? (
              <FichaKv label="Metragem" value={qtdeTxt(corrida.metros, 'm', 1)} />
            ) : null}
            {corrida.m2 != null ? <FichaKv label="Área" value={qtdeTxt(corrida.m2, 'm²', 2)} /> : null}
            {corrida.acertoM2 != null ? (
              <FichaKv label="Acerto" value={qtdeTxt(corrida.acertoM2, 'm²', 2)} />
            ) : null}
            {corrida.rolos != null ? (
              <FichaKv label="Rolos" value={formatDecimalBr(corrida.rolos, 0)} />
            ) : null}
            {corrida.caixas != null ? (
              <FichaKv label="Caixas" value={formatDecimalBr(corrida.caixas, 0)} />
            ) : null}
          </div>
        </FichaSection>
      ) : null}

      <FichaSection title="Material">
        {materiais.length === 0 ? (
          <p className="ficha-empty">Ainda não há lista de material nesta ordem.</p>
        ) : (
          <table className="ficha-table ficha-op-materiais">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Quanto</th>
                <th>Local</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {materiais.map((m, i) => {
                const estado = opKitEstado(m);
                const nome = opKitNome(m);
                const quanto = formatQuantoFicha(m, o);
                return (
                  <tr key={m.id} className={`ficha-op-mat ficha-op-mat--${estado}`}>
                    <td>{i + 1}</td>
                    <td>
                      {nome}
                      {m.produto?.codigo ? (
                        <div className="ficha-muted">{m.produto.codigo}</div>
                      ) : null}
                    </td>
                    <td>
                      {quanto.pedido}
                      {quanto.volumes ? (
                        <div className="ficha-op-volumes">{quanto.volumes}</div>
                      ) : null}
                    </td>
                    <td>{opKitOnde(m)}</td>
                    <td>{opKitEstadoLabel(estado)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </FichaSection>

      <FichaSection title="Conferência">
        <div className="ficha-kv-grid cols-3">
          <FichaKv
            label="Entregue para"
            value={o.handoff?.recebidos_nome?.trim() || '________________'}
          />
          <FichaKv label="Sobra devolvida" value="________________" />
          <FichaKv label="Perda / falta" value="________________" />
        </div>
      </FichaSection>

      {o.rastreio ? <RastreioFichaSection rastreio={o.rastreio} /> : null}

      {o.status === 'CONCLUIDA' ? (
        <FichaSection title="Resultado">
          <div className="ficha-kv-grid cols-3">
            <FichaKv
              label="Etiquetas boas"
              value={o.qtde_boa != null ? formatDecimalBr(Number(o.qtde_boa), 0) : '—'}
            />
            <FichaKv label="Refugo" value={formatDecimalBr(Number(o.qtde_refugo), 0)} />
            <FichaKv label="Fora da tolerância" value={o.fora_tolerancia ? 'Sim' : 'Não'} />
            {o.motivo_fora_tolerancia ? (
              <FichaKv label="Motivo" value={o.motivo_fora_tolerancia} wide />
            ) : null}
          </div>
        </FichaSection>
      ) : null}

      {o.status === 'CANCELADA' ? (
        <FichaSection title="Devolvida ao pedido">
          <div className="ficha-kv-grid cols-2">
            <FichaKv label="Motivo" value={dash(o.motivo_cancelamento)} wide />
            <FichaKv
              label="Cancelada em"
              value={o.cancelada_em ? formatDateTime(o.cancelada_em) : '—'}
            />
          </div>
        </FichaSection>
      ) : null}

      {o.observacao ? (
        <FichaSection title="Observações">
          <p className="ficha-obs">{o.observacao}</p>
        </FichaSection>
      ) : null}

      <RegistroMetaStrip
        registro={{
          criado_por: o.criado_por,
          atualizado_por: o.atualizado_por ?? o.criado_por,
          created_at: o.created_at,
          updated_at: o.updated_at ?? o.created_at,
        }}
        className="ficha-autoria"
      />

      <footer className="ficha-footer">
        <span>
          Uso interno · {o.codigo} · emitido por {emitidoPor}
        </span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}
