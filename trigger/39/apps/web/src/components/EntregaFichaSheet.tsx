import { TriggerAttribution } from './TriggerAttribution';
import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
import type { Entrega } from '../lib/api';
import { BRAND } from '../lib/brand';
import {
  entStatusLabel,
  formatDestinoLinha,
  modoEntregaLabel,
  provaTipoLabel,
  tipoSaidaLabel,
} from '../lib/expedicaoUi';
import { formatDateTimeBr } from '../lib/producaoFicha';

export type EntregaFichaSheetProps = {
  entrega: Entrega;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

export function EntregaFichaSheet({
  entrega: e,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: EntregaFichaSheetProps) {
  const titulo =
    e.modo === 'RETIRAR' ? 'Comprovante de retirada (ENT)' : 'Romaneio de entrega (ENT)';

  return (
    <article className="ficha-sheet" aria-label={`${titulo} ${e.codigo}`}>
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">{titulo}</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{e.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{e.parceiro?.razao_social ?? '—'}</h2>
          <p className="ficha-fantasia">
            {e.pedido?.codigo ?? 'PED'}
            {e.faturamento?.codigo ? ` · ${e.faturamento.codigo}` : ''}
          </p>
        </div>
        <div className="ficha-title-meta">
          <span className="ficha-chip">{entStatusLabel(e.status)}</span>
          <span className="ficha-chip ficha-chip-papel">{modoEntregaLabel(e.modo)}</span>
        </div>
      </div>

      <FichaSection title="Saída">
        <div className="ficha-kv-grid">
          <FichaKv label="Tipo" value={tipoSaidaLabel(e.tipo_saida)} />
          <FichaKv label="Volumes" value={String(e.volumes)} />
          <FichaKv label="Quantidade" value={e.unidade ? `${e.qtde} ${e.unidade}` : e.qtde} />
          {e.transportadora ? (
            <FichaKv label="Transportadora" value={e.transportadora.razao_social} />
          ) : null}
          {e.rastreio ? <FichaKv label="Rastreio" value={e.rastreio} /> : null}
        </div>
      </FichaSection>

      <FichaSection title="Destino">
        <p>
          {e.destino?.label ?? '—'}
          <br />
          {formatDestinoLinha(e.destino)}
          {e.destino?.responsavel ? (
            <>
              <br />
              Receber: {e.destino.responsavel}
            </>
          ) : null}
        </p>
      </FichaSection>

      {e.status === 'ENTREGUE' ? (
        <FichaSection title="Confirmação">
          <p>
            {provaTipoLabel(e.prova_tipo ?? '')}
            {e.prova_nome ? ` · ${e.prova_nome}` : ''}
            {e.prova_documento ? ` · ${e.prova_documento}` : ''}
            {e.prova_obs ? ` · ${e.prova_obs}` : ''}
          </p>
        </FichaSection>
      ) : e.modo === 'RETIRAR' ? (
        <FichaSection title="Canhoto de retirada">
          <p>Nome: _________________________________ &nbsp; Documento: ____________________</p>
          <p>Data / hora: ____________________ &nbsp; Assinatura: ____________________</p>
        </FichaSection>
      ) : (
        <FichaSection title="Canhoto">
          <p>Recebido por: _________________________________ &nbsp; Documento: ____________________</p>
          <p>Data / hora: ____________________ &nbsp; Assinatura: ____________________</p>
        </FichaSection>
      )}

      <footer className="ficha-footer">
        <span>
          Emitido por {emitidoPor} · uso interno · {e.codigo}
        </span>
        <TriggerAttribution variant="print" />
      </footer>
    </article>
  );
}
