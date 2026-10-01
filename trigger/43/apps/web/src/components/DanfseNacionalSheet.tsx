import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { DanfseParte, DanfsePrevia } from '../lib/api';
import { TriggerAttribution } from './TriggerAttribution';
import { formatCep, formatCnpjCpf, formatDate, formatDecimalBr } from '../lib/format';

const LOGO = '/branding/nfse/logo-nfse-horizontal.png';

function txt(value?: string | null): string {
  const v = (value ?? '').trim();
  return v !== '' ? v : ' ';
}

function docFmt(value?: string | null): string {
  const raw = (value ?? '').trim();
  if (raw === '') return ' ';
  return formatCnpjCpf(raw);
}

function money(value?: string | null): string {
  if (value == null || String(value).trim() === '') return ' ';
  const n = formatDecimalBr(value, 2);
  return n === '—' ? ' ' : `R$ ${n}`;
}

function when(value?: string | null): string {
  if (!value) return ' ';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function Field({
  label,
  value,
  span,
}: {
  label: string;
  value?: string | null;
  span?: number;
}) {
  return (
    <div className="danfse-v2-field" style={span ? { gridColumn: `span ${span}` } : undefined}>
      <b>{label}</b>
      <span>{txt(value)}</span>
    </div>
  );
}

function Parte({
  titulo,
  subtitulo,
  parte,
  comRegime,
}: {
  titulo: string;
  subtitulo?: string;
  parte?: DanfseParte;
  comRegime?: boolean;
}) {
  return (
    <section className="danfse-v2-band">
      <div className="danfse-v2-grid4">
        <div className="danfse-v2-field">
          <b>{titulo}</b>
          {subtitulo ? <span>{subtitulo}</span> : null}
        </div>
        <Field label="CNPJ / CPF / NIF" value={docFmt(parte?.documento)} />
        <Field label="Inscrição Municipal" value={parte?.im} />
        <Field label="Telefone" value={parte?.telefone} />
        <Field label="Nome / Nome empresarial" value={parte?.nome} span={2} />
        <Field label="E-mail" value={parte?.email} span={2} />
        <Field label="Endereço" value={parte?.endereco} span={2} />
        <Field label="Municipio" value={parte?.municipio} />
        <Field label="CEP" value={parte?.cep ? formatCep(parte.cep) : ' '} />
        {comRegime ? (
          <>
            <Field label="Simples Nacional na Data de Competência" value={parte?.simples} span={2} />
            <Field label="Regime de Apuração Tributária pelo SN" value={parte?.regime_sn} span={2} />
          </>
        ) : null}
      </div>
    </section>
  );
}

/**
 * DANFSe nacional v2 — mesmas faixas do documento auxiliar que já emite no exemplo 22.
 * Sem chave da SEFIN, o QR fica vazio. Sem alíquota, o ISSQN apurado fica em branco.
 */
export function DanfseNacionalSheet({
  danfse,
  watermark,
  rodape,
}: {
  danfse: DanfsePrevia;
  watermark?: string | null;
  rodape: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const v = danfse.valores;
  const t = danfse.tributacao;
  const s = danfse.servico;

  useEffect(() => {
    const url = danfse.qr_url;
    if (!url) {
      setQr(null);
      return;
    }
    let cancel = false;
    void QRCode.toDataURL(url, { width: 230, margin: 0 }).then((data) => {
      if (!cancel) setQr(data);
    });
    return () => {
      cancel = true;
    };
  }, [danfse.qr_url]);

  return (
    <article className="ficha-sheet danfe-sheet danfse-v2" aria-label="DANFSe — Documento Auxiliar da NFS-e">
      {watermark ? (
        <div className="danfe-watermark" aria-hidden>
          {watermark}
        </div>
      ) : null}

      <header className="danfse-v2-title">
        <img src={LOGO} alt="NFS-e Nacional" />
        <div>
          <strong>DANFSe v{danfse.versao || '1.01'}</strong>
          <span>Documento Auxiliar da NFS-e</span>
        </div>
        <p>{danfse.prefeitura || ' '}</p>
      </header>

      <section className="danfse-v2-band danfse-v2-id">
        <div>
          <Field label="Chave de Acesso da NFS-e" value={danfse.chave} />
          <div className="danfse-v2-grid3">
            <Field label="Número da NFS-e" value={danfse.numero_nfse} />
            <Field label="Competência da NFS-e" value={danfse.competencia ? formatDate(danfse.competencia) : ' '} />
            <Field label="Data e Hora da emissão da NFS-e" value={when(danfse.dh_nfse)} />
            <Field label="Número da DPS" value={danfse.numero_dps} />
            <Field label="Série da DPS" value={danfse.serie_dps} />
            <Field label="Data e Hora da emissão da DPS" value={when(danfse.dh_dps)} />
          </div>
        </div>
        <div className="danfse-v2-qr">
          {qr ? <img src={qr} alt="QR Code de consulta da NFS-e" /> : <span className="danfse-v2-qr-vazio" />}
          <p>
            A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de
            acesso no portal nacional da NFS-e
          </p>
        </div>
      </section>

      <Parte titulo="EMITENTE DA NFS-e" subtitulo="Prestador do Serviço" parte={danfse.prestador} comRegime />
      <Parte titulo="TOMADOR DO SERVIÇO" parte={danfse.tomador} />

      <section className="danfse-v2-band">
        <h2>SERVIÇO PRESTADO</h2>
        <div className="danfse-v2-grid4">
          <Field label="Código de Tributação Nacional" value={s?.codigo_tributacao} />
          <Field label="Código de Tributação Municipal" value={s?.codigo_municipal} />
          <Field label="Local da Prestação" value={s?.local} />
          <Field label="País de Prestação" value={s?.pais} />
          <Field label="Descrição do Serviço" value={s?.descricao} span={4} />
        </div>
      </section>

      <section className="danfse-v2-band">
        <h2>TRIBUTAÇÃO MUNICIPAL</h2>
        <div className="danfse-v2-grid4">
          <Field label="Tributação do ISSQN" value={t?.issqn} />
          <Field label="País Resultado da Prestação do Serviço" value={t?.pais_resultado} />
          <Field label="Município de Incidência do ISSQN" value={t?.incidencia} />
          <Field label="Regime Especial de Tributação" value={t?.regime_especial} />
          <Field label="Tipo de Imunidade" value={t?.imunidade} />
          <Field label="Suspensão da Exigibilidade do ISSQN" value={t?.suspensao} />
          <Field label="Número Processo Suspensão" value={t?.processo} />
          <Field label="Benefício Municipal" value={t?.beneficio} />
          <Field label="Valor do Serviço" value={money(v?.servico)} />
          <Field label="Desconto incondicionado" value={money(v?.desconto_incondicionado)} />
          <Field label="Total Deduções/Reduções" value={money(v?.deducoes)} />
          <Field label="Cálculo do BM" value={money(v?.calculo_bm)} />
          <Field label="BC ISSQN" value=" " />
          <Field label="Alíquota Aplicada %" value=" " />
          <Field label="Retenção do ISSQN" value={t?.retencao_iss} />
          <Field label="ISSQN Apurado" value=" " />
        </div>
        <h2 className="danfse-v2-split">TRIBUTAÇÃO FEDERAL</h2>
        <div className="danfse-v2-grid4">
          <Field label="IRRF" value=" " />
          <Field label="Contribuição Previdenciária - Retida" value=" " />
          <Field label="Contribuições Sociais - Retidas" value=" " />
          <Field label="Descrição Contrib. Sociais - Retidas" value={t?.retencao_pis_cofins} />
          <Field label="PIS - Débito Apuração Própria" value=" " />
          <Field label="COFINS - Débito Apuração Própria" value=" " />
        </div>
      </section>

      <section className="danfse-v2-band">
        <h2>VALOR TOTAL DA NFS-E</h2>
        <div className="danfse-v2-grid4">
          <Field label="Valor do Serviço" value={money(v?.servico)} />
          <Field label="Desconto Condicionado" value={money(v?.desconto_condicionado)} />
          <Field label="Desconto Incondicionado" value={money(v?.desconto_incondicionado)} />
          <Field label="ISSQN Retido" value=" " />
          <Field label="IRRF, CP, CSLL - Retidos" value={money('0.00')} />
          <Field label="PIS/COFINS Retidos" value={money('0.00')} span={2} />
          <Field label="Valor Líquido da NFS-e" value={money(v?.liquido)} />
        </div>
        <h2 className="danfse-v2-split">TOTAIS APROXIMADOS DOS TRIBUTOS</h2>
        <div className="danfse-v2-grid3">
          <Field label="Federais" value=" " />
          <Field label="Estaduais" value=" " />
          <Field label="Municipais" value=" " />
        </div>
      </section>

      <section className="danfse-v2-band">
        <h2>INFORMAÇÕES COMPLEMENTARES</h2>
        <p className="danfse-v2-comp">{txt(danfse.complemento)}</p>
        <Field label="NBS" value={s?.nbs} />
      </section>

      <footer className="danfe-foot">
        <span>
          {rodape}
          <br />
          Documento gerado no padrão da Nota Técnica 008/2026 — DANFSe v2.0.
        </span>
        <TriggerAttribution variant="print" className="ficha-powered" logoClassName="ficha-trigger" />
      </footer>
    </article>
  );
}
