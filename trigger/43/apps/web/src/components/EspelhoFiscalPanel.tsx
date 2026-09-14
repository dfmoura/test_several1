import type { NfeEntradaEspelho } from '../lib/api';
import { formatCnpjCpf, formatPhone } from '../lib/format';

function idDestLabel(id: string | null | undefined): string {
  if (id === '1') return 'Interna';
  if (id === '2') return 'Interestadual';
  if (id === '3') return 'Exterior';
  return id || '—';
}

function dash(value: string | null | undefined): string {
  return value && value !== '' ? value : '—';
}

function modFreteLabel(mod: string | null | undefined): string {
  if (mod === '0') return 'CIF (emitente)';
  if (mod === '1') return 'FOB (destinatário)';
  if (mod === '2') return 'Terceiros';
  if (mod === '3') return 'Próprio remetente';
  if (mod === '4') return 'Próprio destinatário';
  if (mod === '9') return 'Sem frete';
  return mod || '—';
}

function tPagLabel(t: string | null | undefined): string {
  const map: Record<string, string> = {
    '01': 'Dinheiro',
    '02': 'Cheque',
    '03': 'Cartão crédito',
    '04': 'Cartão débito',
    '05': 'Crédito loja',
    '15': 'Boleto',
    '16': 'Depósito',
    '17': 'PIX',
    '18': 'Transferência',
    '90': 'Sem pagamento',
    '99': 'Outros',
  };
  if (!t) return '—';
  return map[t] ? `${map[t]} (${t})` : t;
}

/** Espelho fiscal de entrada — cópia do XML; não é escrituração. */
export function EspelhoFiscalPanel({
  espelho,
  titulo,
  defaultOpen = false,
}: {
  espelho: NfeEntradaEspelho;
  titulo: string;
  defaultOpen?: boolean;
}) {
  const c = espelho.complementos;
  const resp = c?.resp_tec;
  const infAdic = c?.inf_adic;
  const transp = c?.transporte;
  const fat = c?.fat;
  const pag = c?.pag;
  const destComp = c?.dest;
  const ideExtra = c?.ide_extra;
  const vols = transp?.vol ?? [];
  const detPag = pag?.det_pag ?? [];

  return (
    <details className="oc-receber-details" open={defaultOpen || undefined}>
      <summary>
        <span className="oc-receber-details__title">{titulo}</span>
        <span className="muted"> · impostos como no XML — abrir se precisar</span>
      </summary>
      <div className="oc-receber-details__body alert alert-info">
        <div className="muted" style={{ margin: '0 0 0.75rem' }}>
          Guardado para o livro de entrada — o ERP não faz escrituração oficial.
        </div>
        <p style={{ marginBottom: '0.5rem' }}>
          NF {dash(espelho.numero)}
          {espelho.serie ? ` série ${espelho.serie}` : ''}
          {' · '}
          {dash(espelho.nat_op)}
          {' · '}
          {idDestLabel(espelho.id_dest)}
          {espelho.emit_uf ? ` · UF ${espelho.emit_uf}` : ''}
          {espelho.emit_crt ? ` · CRT ${espelho.emit_crt}` : ''}
        </p>
        {destComp?.nome || destComp?.email ? (
          <p style={{ marginBottom: '0.5rem' }}>
            Destinatário {dash(destComp?.nome)}
            {destComp?.email ? ` · ${destComp.email}` : ''}
          </p>
        ) : null}
        {ideExtra?.d_prev_entrega || ideExtra?.dh_sai_ent ? (
          <p style={{ marginBottom: '0.5rem' }}>
            {ideExtra.d_prev_entrega ? `Prev. entrega ${ideExtra.d_prev_entrega}` : null}
            {ideExtra.d_prev_entrega && ideExtra.dh_sai_ent ? ' · ' : null}
            {ideExtra.dh_sai_ent ? `Saída/entrada ${ideExtra.dh_sai_ent}` : null}
          </p>
        ) : null}
        <p style={{ marginBottom: '0.75rem' }}>
          BC {dash(espelho.totais.v_bc)}
          {' · ICMS '}
          {dash(espelho.totais.v_icms)}
          {' · IPI '}
          {dash(espelho.totais.v_ipi)}
          {' · PIS '}
          {dash(espelho.totais.v_pis)}
          {' · COFINS '}
          {dash(espelho.totais.v_cofins)}
          {' · ST '}
          {dash(espelho.totais.v_st)}
          {espelho.totais.v_nf ? ` · vNF ${espelho.totais.v_nf}` : ''}
        </p>
        {(espelho.totais.v_ibs || espelho.totais.v_cbs || espelho.totais.v_bc_ibs_cbs) && (
          <p style={{ marginBottom: '0.75rem' }}>
            IBS/CBS BC {dash(espelho.totais.v_bc_ibs_cbs)}
            {' · IBS '}
            {dash(espelho.totais.v_ibs)}
            {' · CBS '}
            {dash(espelho.totais.v_cbs)}
            {espelho.totais.v_ibs_uf ? ` · IBS UF ${espelho.totais.v_ibs_uf}` : ''}
            {espelho.totais.v_ibs_mun ? ` · IBS Mun ${espelho.totais.v_ibs_mun}` : ''}
          </p>
        )}
        {resp && (resp.x_contato || resp.cnpj || resp.email || resp.fone) ? (
          <p style={{ marginBottom: '0.5rem' }}>
            Resp. técnico {dash(resp.x_contato)}
            {resp.cnpj ? ` · ${formatCnpjCpf(resp.cnpj)}` : ''}
            {resp.fone ? ` · ${formatPhone(resp.fone) || resp.fone}` : ''}
            {resp.email ? ` · ${resp.email}` : ''}
          </p>
        ) : null}
        {transp && (transp.mod_frete || transp.transporta || vols.length > 0 || transp.veiculo) ? (
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ margin: '0 0 0.35rem' }}>
              <strong>Transporte</strong>
              {' · Frete '}
              {modFreteLabel(transp.mod_frete)}
            </p>
            {transp.transporta ? (
              <p style={{ margin: '0 0 0.35rem' }}>
                Transportadora {dash(transp.transporta.nome)}
                {transp.transporta.cnpj
                  ? ` · ${formatCnpjCpf(transp.transporta.cnpj)}`
                  : transp.transporta.cpf
                    ? ` · ${formatCnpjCpf(transp.transporta.cpf)}`
                    : ''}
                {transp.transporta.ie ? ` · IE ${transp.transporta.ie}` : ''}
                {transp.transporta.municipio || transp.transporta.uf
                  ? ` · ${[transp.transporta.municipio, transp.transporta.uf].filter(Boolean).join('/')}`
                  : ''}
                {transp.transporta.endereco ? ` · ${transp.transporta.endereco}` : ''}
              </p>
            ) : null}
            {transp.veiculo?.placa ? (
              <p style={{ margin: '0 0 0.35rem' }}>
                Veículo {transp.veiculo.placa}
                {transp.veiculo.uf ? `/${transp.veiculo.uf}` : ''}
                {transp.veiculo.rntc ? ` · RNTC ${transp.veiculo.rntc}` : ''}
              </p>
            ) : null}
            {vols.length > 0 ? (
              <div className="table-wrap" style={{ marginTop: '0.35rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Volumes (vol)</th>
                      <th>Espécie</th>
                      <th>Marca</th>
                      <th>Nº vol.</th>
                      <th className="num">Peso L</th>
                      <th className="num">Peso B</th>
                      <th>Lacres</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vols.map((v, idx) => (
                      <tr key={`vol-${idx}-${v.n_vol ?? ''}-${v.esp ?? ''}`}>
                        <td>{dash(v.q_vol)}</td>
                        <td>{dash(v.esp)}</td>
                        <td>{dash(v.marca)}</td>
                        <td>{dash(v.n_vol)}</td>
                        <td className="num">{dash(v.peso_l)}</td>
                        <td className="num">{dash(v.peso_b)}</td>
                        <td>
                          {(v.lacres ?? []).map((l) => l.n_lacre).filter(Boolean).join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
        {fat || detPag.length > 0 ? (
          <p style={{ marginBottom: '0.5rem' }}>
            {fat?.n_fat ? `Fatura ${fat.n_fat}` : null}
            {fat?.v_liq ? `${fat?.n_fat ? ' · ' : ''}líq. ${fat.v_liq}` : null}
            {detPag[0]
              ? `${fat ? ' · ' : ''}Pag. ${tPagLabel(detPag[0].t_pag)}${
                  detPag[0].ind_pag === '0' ? ' à vista' : detPag[0].ind_pag === '1' ? ' a prazo' : ''
                }${detPag[0].v_pag ? ` ${detPag[0].v_pag}` : ''}`
              : null}
          </p>
        ) : null}
        {infAdic?.inf_cpl || infAdic?.inf_ad_fisco ? (
          <div style={{ marginBottom: '0.75rem' }}>
            {infAdic.inf_cpl ? (
              <p style={{ margin: '0 0 0.35rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                <span className="muted">Inf. complementares: </span>
                {infAdic.inf_cpl}
              </p>
            ) : null}
            {infAdic.inf_ad_fisco ? (
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                <span className="muted">Inf. fisco: </span>
                {infAdic.inf_ad_fisco}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>CFOP</th>
                <th>NCM</th>
                <th>Orig</th>
                <th>CST</th>
                <th>Alíq.</th>
                <th>ICMS</th>
                <th>IPI</th>
                <th>PIS</th>
                <th>COFINS</th>
                <th>CST IBS/CBS</th>
                <th>IBS</th>
                <th>CBS</th>
                <th>xPed</th>
                <th>FCI</th>
              </tr>
            </thead>
            <tbody>
              {espelho.itens.map((item) => (
                <tr key={item.n_item}>
                  <td>{item.n_item}</td>
                  <td>{dash(item.cfop)}</td>
                  <td>{dash(item.ncm)}</td>
                  <td>{dash(item.orig)}</td>
                  <td>{dash(item.cst)}</td>
                  <td>{dash(item.p_icms)}</td>
                  <td>{dash(item.v_icms)}</td>
                  <td>{dash(item.v_ipi)}</td>
                  <td>{dash(item.v_pis)}</td>
                  <td>{dash(item.v_cofins)}</td>
                  <td>
                    {dash(item.cst_ibs_cbs)}
                    {item.c_class_trib ? ` / ${item.c_class_trib}` : ''}
                  </td>
                  <td>{dash(item.v_ibs)}</td>
                  <td>{dash(item.v_cbs)}</td>
                  <td>{dash(item.x_ped)}</td>
                  <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
                    {dash(item.n_fci)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
