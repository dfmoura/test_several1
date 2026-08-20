import type { CnpjConsulta } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';

type Props = {
  consulta: CnpjConsulta;
};

export function CnpjConsultaMetaStrip({ consulta }: Props) {
  return (
    <div className="meta-strip">
      <div className="meta-chip">
        <strong>Situação RFB</strong>
        <span>{consulta.situacao_rfb ?? consulta.descricao_situacao_cadastral ?? '—'}</span>
      </div>
      <div className="meta-chip">
        <strong>Porte</strong>
        <span>{consulta.porte ?? '—'}</span>
      </div>
      <div className="meta-chip">
        <strong>Natureza</strong>
        <span>{consulta.natureza_juridica ?? '—'}</span>
      </div>
      <div className="meta-chip">
        <strong>Tipo</strong>
        <span>{consulta.descricao_identificador_matriz_filial ?? '—'}</span>
      </div>
      <div className="meta-chip">
        <strong>Abertura</strong>
        <span>{formatDate(consulta.data_inicio_atividade)}</span>
      </div>
      <div className="meta-chip">
        <strong>Capital social</strong>
        <span>{formatCurrency(consulta.capital_social)}</span>
      </div>
    </div>
  );
}
