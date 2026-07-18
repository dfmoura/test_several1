/* ============================================================
   propostas_abertas.js — itens com prazo PNCP vigente + análise de preço
   ============================================================ */

let propLastItems = [];
let propSortKey = "horas_restantes";
let propSortDir = "asc";
let propItemAtual = null;
let propFiltrosProntos = false;
let propMercadoBusy = false;
let propMercadoPrompt = "";
let propAnaliseSnapshot = null;
let propIaSnapshot = null;
let propIaUltima = null;

const PROP_SORT_GETTERS = {
  horas_restantes: (r) => r.horas_restantes,
  numero_compra: (r) => r.numero_compra || "",
  processo: (r) => r.processo || "",
  numero_item: (r) => r.numero_item,
  descricao_resumida: (r) => r.descricao_resumida || "",
  codigo_ncm: (r) => r.codigo_ncm || "",
  quantidade: (r) => r.quantidade,
  valor_unitario_estimado_num: (r) => r.valor_unitario_estimado_num,
  valor_total_num: (r) => r.valor_total_num,
  desvio_pct: (r) => r.desvio_preco?.percentual,
  unidade_nome: (r) => r.unidade_nome || "",
};

const PROP_COMP_LABEL = {
  mais_barato: "Processo mais barato que o mercado",
  alinhado: "Processo alinhado ao mercado",
  mais_caro: "Processo mais caro que o mercado",
  indeterminado: "Comparativo indeterminado",
};

function propEhAdmin() {
  return window.OSB?.usuario?.papel === "admin";
}

function propParams() {
  const params = new URLSearchParams();
  const g = (id) => $(id)?.value?.trim();
  if (g("#prop-filtro-horizonte")) params.set("horizonte", g("#prop-filtro-horizonte"));
  if (g("#prop-filtro-unidade")) params.set("unidade_codigo", g("#prop-filtro-unidade"));
  appendQueryAll(params, "modalidade_codigo", multiSelectOf("#prop-filtro-modalidade")?.getValues());
  if (g("#prop-filtro-tipo")) params.set("material_ou_servico", g("#prop-filtro-tipo"));
  const ia = g("#prop-filtro-ia");
  if (ia && ia !== "todos") params.set("ia_desvio", ia);
  if (g("#prop-filtro-texto")) params.set("texto", g("#prop-filtro-texto"));
  params.set("limit", "1000");
  return params;
}

function pillUrgencia(urg, horas) {
  const map = {
    critica: "Crítica",
    alta: "Alta",
    media: "Média",
    normal: "Normal",
  };
  const label = map[urg] || urg || "—";
  let tempo = "—";
  if (horas != null && Number.isFinite(horas)) {
    if (horas < 48) tempo = `${Math.round(horas)}h`;
    else tempo = `${(horas / 24).toFixed(1)}d`;
  }
  return `<span class="pill-urg pill-urg-${esc(urg || "normal")}" title="${esc(label)}">${esc(tempo)}</span>`;
}

function pillDesvio(desvio) {
  if (!desvio) return '<span class="muted-inline">—</span>';
  const cls = `pill-desvio pill-desvio-${desvio.sinal || "alinhado"}`;
  return `<span class="${cls}" title="Em relação à mediana local do catálogo">${esc(desvio.percentual_fmt)}</span>`;
}

function tituloAnaliseIa(analise) {
  if (!analise || analise.status === "pendente") {
    return "Nenhuma análise concluída para este item";
  }
  if (analise.status !== "ok") {
    return "A última análise não foi concluída";
  }
  const comparativo = analise.comparativo || "indeterminado";
  const desvioNum = Number(analise.desvio_percentual_aprox);
  const temDesvio = analise.desvio_percentual_aprox != null && Number.isFinite(desvioNum);
  const compDetalhe = PROP_COMP_LABEL[comparativo] || "Análise de mercado concluída";
  const desvioDetalhe = temDesvio
    ? ` · Desvio aproximado vs. processo: ${desvioNum > 0 ? "+" : ""}${desvioNum.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
    : "";
  const dataDetalhe = analise.criado_em ? ` · ${analise.criado_em}` : "";
  return `${compDetalhe}${desvioDetalhe}${dataDetalhe}`;
}

/** % compacto só quando a análise ok tem desvio numérico. */
function fmtDesvioIaPct(analise) {
  const desvioNum = Number(analise?.desvio_percentual_aprox);
  if (analise?.desvio_percentual_aprox == null || !Number.isFinite(desvioNum)) return "";
  const abs = Math.abs(desvioNum).toLocaleString("pt-BR", {
    maximumFractionDigits: Math.abs(desvioNum) >= 10 ? 0 : 1,
  });
  const sign = desvioNum > 0 ? "+" : desvioNum < 0 ? "−" : "";
  return `${sign}${abs}%`;
}

function pillAnaliseIa(analise) {
  const title = tituloAnaliseIa(analise);
  if (!analise || analise.status === "pendente") {
    return (
      `<span class="prop-ia-cell prop-ia-table-pendente" role="img" ` +
      `aria-label="Aguardando análise de IA" title="${esc(title)}">` +
      `<span class="prop-ia-mark" aria-hidden="true"></span></span>`
    );
  }
  if (analise.status !== "ok") {
    return (
      `<span class="prop-ia-cell prop-ia-table-erro" role="img" ` +
      `aria-label="Análise de IA indisponível" title="${esc(title)}">` +
      `<span class="prop-ia-mark" aria-hidden="true"></span></span>`
    );
  }

  const comparativo = analise.comparativo || "indeterminado";
  const pct = fmtDesvioIaPct(analise);
  const ariaBase = PROP_COMP_LABEL[comparativo] || "Análise concluída";
  const aria = pct ? `${ariaBase} · ${pct}` : ariaBase;
  const pctHtml = pct
    ? `<span class="prop-ia-pct">${esc(pct)}</span>`
    : "";
  return (
    `<span class="prop-ia-cell prop-ia-table-${esc(comparativo)}" role="img" ` +
    `aria-label="${esc(aria)}" title="${esc(title)}">` +
    `<span class="prop-ia-mark" aria-hidden="true"></span>${pctHtml}</span>`
  );
}

function atualizarAnaliseIaTabela(itemId, analise) {
  const item = propLastItems.find((r) => String(r.item_id) === String(itemId));
  if (!item || !analise) return;
  const estruturado = analise.resposta_estruturada || {};
  item.analise_ia = {
    status: analise.status,
    comparativo: estruturado.comparativo || null,
    desvio_percentual_aprox: estruturado.desvio_percentual_aprox ?? null,
    criado_em: analise.criado_em || null,
  };
  renderPropTabela();
}

function fmtPrazoRestante(horas) {
  if (horas == null || !Number.isFinite(horas)) return "—";
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  if (horas < 48) return `${horas.toFixed(1)} h`;
  return `${(horas / 24).toFixed(1)} dias`;
}

function propPdfBtnSet(ready, title) {
  const btn = $("#btn-prop-gerar-pdf");
  if (!btn) return;
  btn.disabled = !ready;
  btn.title = title || (ready
    ? "Gerar relatório PDF deste item"
    : "Aguarde o carregamento do registro");
}

function propPdfTxt(v) {
  if (v == null || v === "") return "—";
  return String(v);
}

function propPdfDl(rows) {
  const items = (rows || []).filter(([, v]) => v != null && v !== "");
  if (!items.length) return '<p class="pdf-empty">Sem dados nesta seção.</p>';
  return `<dl class="pdf-dl">${items.map(([k, v]) =>
    `<div class="pdf-dl-row"><dt>${esc(k)}</dt><dd>${esc(propPdfTxt(v))}</dd></div>`
  ).join("")}</dl>`;
}

function propPdfTable(headers, rows) {
  if (!rows.length) return '<p class="pdf-empty">Nenhum registro.</p>';
  return `<table class="pdf-table"><thead><tr>${
    headers.map((h) => `<th>${esc(h)}</th>`).join("")
  }</tr></thead><tbody>${rows.map((r) =>
    `<tr>${r.map((c) => `<td>${esc(propPdfTxt(c))}</td>`).join("")}</tr>`
  ).join("")}</tbody></table>`;
}

function propPdfSecaoIa(analise, item) {
  const unitProc = item?.valor_unitario_estimado || "—";
  if (!analise) {
    return `<section class="pdf-sec pdf-ia">
      <div class="pdf-ia-head">
        <h2>Último retorno da IA · preço de mercado</h2>
        <span class="pdf-ia-pill pdf-ia-pill-mute">Sem análise</span>
      </div>
      <p class="pdf-empty">Nenhuma análise de mercado registrada para este item.</p>
      <p class="pdf-note">Resultado auxiliar para apoio à fiscalização — não constitui prova oficial de preço.</p>
    </section>`;
  }
  if (analise.status !== "ok") {
    return `<section class="pdf-sec pdf-ia">
      <div class="pdf-ia-head">
        <h2>Último retorno da IA · preço de mercado</h2>
        <span class="pdf-ia-pill pdf-ia-pill-err">Erro</span>
      </div>
      <p class="pdf-note">Resultado auxiliar para apoio à fiscalização — não constitui prova oficial de preço.</p>
      <div class="pdf-ia-meta-bar">
        ${esc([analise.criado_em, analise.provedor_nome, analise.modelo].filter(Boolean).join(" · ") || "—")}
      </div>
      <div class="pdf-ia-block pdf-ia-block-err">
        <h3>Falha na consulta</h3>
        <p>${esc(propPdfTxt(analise.erro || "Falha na busca de preços de mercado."))}</p>
      </div>
    </section>`;
  }

  const est = analise.resposta_estruturada || {};
  const faixa = est.faixa_unitario || {};
  const compKey = est.comparativo || "indeterminado";
  const comp = PROP_COMP_LABEL[compKey] || est.comparativo || "Comparativo indeterminado";
  const desvio = est.desvio_percentual_aprox;
  const desvioTxt = desvio != null && Number.isFinite(Number(desvio))
    ? `${Number(desvio) > 0 ? "+" : ""}${Number(desvio)}%`
    : "—";
  const tipoLabel = {
    marketplace: "Marketplace",
    varejo: "Varejo",
    atacado_b2b: "Atacado / B2B",
    painel_publico: "Painel público",
    catalogo: "Catálogo",
    fabricante: "Fabricante",
    outro: "Outro",
  };
  const achados = Array.isArray(est.achados) ? est.achados : [];
  const fontes = Array.isArray(est.fontes) ? est.fontes.filter(Boolean) : [];

  let achadosHtml;
  if (!achados.length) {
    achadosHtml = '<p class="pdf-empty">Sem achados estruturados de sites/fontes neste retorno.</p>';
  } else {
    achadosHtml = `<div class="pdf-ia-achados">${achados.map((a, idx) => {
      const site = a?.site || "Fonte sem nome";
      const tipo = tipoLabel[a?.tipo] || a?.tipo || "—";
      const preco = a?.preco_unitario != null ? fmtFaixaMoeda(a.preco_unitario) : "—";
      const produto = a?.produto || "—";
      const ref = a?.referencia_data || "";
      const nota = a?.nota || "";
      const url = (a?.url && String(a.url).trim()) || "";
      return `<article class="pdf-ia-achado">
        <header>
          <span class="pdf-ia-achado-n">${idx + 1}</span>
          <div class="pdf-ia-achado-title">
            <strong>${esc(site)}</strong>
            <span>${esc(tipo)}</span>
          </div>
          <div class="pdf-ia-achado-preco">
            <span>Preço unitário</span>
            <strong>${esc(preco)}</strong>
          </div>
        </header>
        <div class="pdf-ia-achado-body">
          <div><span>Produto / oferta</span><p>${esc(produto)}</p></div>
          ${ref ? `<div><span>Referência / data</span><p>${esc(ref)}</p></div>` : ""}
          ${nota ? `<div><span>Nota</span><p>${esc(nota)}</p></div>` : ""}
          <div><span>URL / referência</span><p class="pdf-ia-url">${esc(url || "—")}</p></div>
        </div>
      </article>`;
    }).join("")}</div>`;
  }

  const temFaixa = faixa.minimo != null || faixa.tipico != null || faixa.maximo != null;
  const bruto = (analise.resposta_texto || "").trim();
  const resumo = (est.resumo_item || "").trim();
  const observacoes = (est.observacoes || "").trim();
  const mostrarBruto = bruto && (!resumo || bruto !== resumo);

  return `<section class="pdf-sec pdf-ia">
    <div class="pdf-ia-head">
      <h2>Último retorno da IA · preço de mercado</h2>
      <span class="pdf-ia-pill pdf-ia-pill-ok">Concluída</span>
    </div>
    <p class="pdf-note">Resultado auxiliar para apoio à fiscalização — não constitui prova oficial de preço.</p>
    <div class="pdf-ia-meta-bar">
      <span><strong>Executado em</strong> ${esc(propPdfTxt(analise.criado_em))}</span>
      <span><strong>Provedor</strong> ${esc(propPdfTxt(analise.provedor_nome))}</span>
      <span><strong>Modelo</strong> ${esc(propPdfTxt(analise.modelo))}</span>
      ${analise.id != null ? `<span><strong>ID análise</strong> ${esc(String(analise.id))}</span>` : ""}
    </div>

    <div class="pdf-ia-veredito pdf-ia-veredito-${esc(compKey)}">
      <div>
        <span class="pdf-ia-veredito-label">Comparativo com o processo</span>
        <strong>${esc(comp)}</strong>
      </div>
      <div>
        <span class="pdf-ia-veredito-label">Unitário no processo</span>
        <strong>${esc(propPdfTxt(unitProc))}</strong>
      </div>
      <div>
        <span class="pdf-ia-veredito-label">Desvio aproximado</span>
        <strong>${esc(desvioTxt)}</strong>
      </div>
    </div>

    ${temFaixa ? `<div class="pdf-ia-bloco">
      <h3>Faixa de preço unitário de mercado (R$)</h3>
      <div class="pdf-kpi pdf-kpi-ia">
        <div><span>Mínimo</span><strong>${esc(fmtFaixaMoeda(faixa.minimo))}</strong></div>
        <div class="pdf-kpi-destaque"><span>Típico</span><strong>${esc(fmtFaixaMoeda(faixa.tipico))}</strong></div>
        <div><span>Máximo</span><strong>${esc(fmtFaixaMoeda(faixa.maximo))}</strong></div>
      </div>
    </div>` : ""}

    ${resumo ? `<div class="pdf-ia-bloco">
      <h3>Interpretação do item</h3>
      <div class="pdf-ia-texto">${esc(resumo)}</div>
    </div>` : ""}

    <div class="pdf-ia-bloco">
      <h3>Achados de preço por site / fonte${achados.length ? ` (${achados.length})` : ""}</h3>
      ${achadosHtml}
    </div>

    ${observacoes ? `<div class="pdf-ia-bloco">
      <h3>Observações e limitações</h3>
      <div class="pdf-ia-texto">${esc(observacoes)}</div>
    </div>` : ""}

    ${fontes.length ? `<div class="pdf-ia-bloco">
      <h3>Síntese das fontes utilizadas</h3>
      <ul class="pdf-ia-fontes">${fontes.map((f) => `<li>${esc(String(f))}</li>`).join("")}</ul>
    </div>` : ""}

    ${mostrarBruto ? `<div class="pdf-ia-bloco pdf-ia-bloco-bruto">
      <h3>Resposta completa da IA</h3>
      <pre class="pdf-pre pdf-pre-ia">${esc(bruto)}</pre>
    </div>` : (!resumo && !mostrarBruto ? '<p class="pdf-empty">Retorno sem texto detalhado persistido.</p>' : "")}
  </section>`;
}

function montarHtmlRelatorioProp(snapshot, ia) {
  const data = snapshot || {};
  const it = data.item || {};
  const ct = data.contratacao || {};
  const b = data.benchmark_catalogo;
  const comps = data.comparaveis || [];
  const pesquisa = data.pesquisa_preco || [];
  const agora = new Date();
  const geradoEm = agora.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
  const usuario = window.OSB?.usuario?.username || window.OSB?.usuario?.nome || "";
  const urgMap = { critica: "Crítica", alta: "Alta", media: "Média", normal: "Normal" };
  const ncm = it.codigo_ncm
    ? (it.descricao_ncm ? `${it.codigo_ncm} — ${it.descricao_ncm}` : it.codigo_ncm)
    : "—";
  const qtd = [it.quantidade, it.unidade_medida].filter(Boolean).join(" ") || "—";
  const desc = it.descricao_detalhada || it.descricao_resumida || "—";
  const tituloDoc = [
    it.numero_item != null && it.numero_item !== "" ? `Item ${it.numero_item}` : null,
    ct.numero ? `Compra ${ct.numero}` : null,
  ].filter(Boolean).join(" · ") || "Análise de preço";

  const origemBench = b
    ? (b.origem === "descricao" ? "Mesma descrição" : "Código de catálogo")
    : null;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Relatório · ${esc(tituloDoc)}</title>
<style>
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #1c2b33;
    font: 11.5px/1.45 "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
    background: #fff;
  }
  .pdf-wrap { max-width: 190mm; margin: 0 auto; }
  .pdf-head {
    display: flex; align-items: center; gap: 14px;
    padding-bottom: 12px; border-bottom: 2px solid #6e9e28;
    margin-bottom: 14px;
  }
  .pdf-logo { height: 42px; width: auto; display: block; }
  .pdf-brand { flex: 1; min-width: 0; }
  .pdf-brand-eyebrow {
    margin: 0; font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
    color: #566571; font-weight: 600;
  }
  .pdf-brand h1 {
    margin: 2px 0 0; font: 600 18px/1.25 "Source Serif 4", Georgia, serif; color: #0d1f2a;
  }
  .pdf-meta-head { text-align: right; font-size: 10.5px; color: #566571; line-height: 1.4; }
  .pdf-lead {
    margin: 0 0 14px; padding: 10px 12px; background: #eef6e4; border: 1px solid #c9e0a8;
    border-radius: 6px; font-size: 12px; line-height: 1.5;
  }
  .pdf-id {
    display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px 12px;
    margin-bottom: 14px; padding: 10px 12px; border: 1px solid #e9e3d6; border-radius: 6px;
    background: #faf8f2;
  }
  .pdf-id div span { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em; color: #566571; font-weight: 600; }
  .pdf-id div strong { display: block; margin-top: 2px; font-size: 12.5px; color: #0d1f2a; font-weight: 600; word-break: break-word; }
  .pdf-sec { margin: 0 0 14px; page-break-inside: avoid; }
  .pdf-sec h2 {
    margin: 0 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ded7c6;
    font: 600 12px/1.3 "IBM Plex Sans", system-ui, sans-serif;
    text-transform: uppercase; letter-spacing: .05em; color: #566571;
  }
  .pdf-sec h3 { margin: 10px 0 6px; font-size: 11.5px; color: #0d1f2a; }
  .pdf-metrics {
    display: grid; grid-template-columns: 1.7fr repeat(3, 1fr); gap: 8px;
    margin-top: 8px;
  }
  .pdf-metric {
    border: 1px solid #e9e3d6; border-radius: 6px; padding: 8px 10px; background: #fff;
  }
  .pdf-metric span { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em; color: #566571; font-weight: 600; }
  .pdf-metric strong { display: block; margin-top: 3px; font: 700 13px/1.3 "Source Serif 4", Georgia, serif; color: #0d1f2a; }
  .pdf-desc {
    margin-top: 8px; padding: 10px 12px; border: 1px solid #e9e3d6; border-radius: 6px;
    background: #faf8f2; white-space: pre-wrap; word-break: break-word; line-height: 1.5;
  }
  .pdf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pdf-dl { margin: 0; }
  .pdf-dl-row { display: grid; grid-template-columns: 38% 1fr; gap: 6px 12px; padding: 4px 0; border-bottom: 1px solid #f0ebe0; }
  .pdf-dl-row:last-child { border-bottom: 0; }
  .pdf-dl dt { margin: 0; color: #566571; font-size: 11px; }
  .pdf-dl dd { margin: 0; color: #1c2b33; word-break: break-word; }
  .pdf-kpi { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 10px; }
  .pdf-kpi div {
    min-width: 88px; padding: 8px 10px; border: 1px solid #e9e3d6; border-radius: 6px; background: #faf8f2;
  }
  .pdf-kpi span { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: .03em; color: #566571; font-weight: 600; }
  .pdf-kpi strong { display: block; margin-top: 2px; font: 700 13px/1.2 "Source Serif 4", Georgia, serif; }
  .pdf-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  .pdf-table th {
    text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: .03em;
    color: #566571; border-bottom: 1px solid #ded7c6; padding: 6px 6px 6px 0; font-weight: 600;
  }
  .pdf-table td { padding: 6px 6px 6px 0; border-bottom: 1px solid #f0ebe0; vertical-align: top; word-break: break-word; }
  .pdf-empty { margin: 0; color: #7b8891; font-style: italic; }
  .pdf-note { margin: 0 0 8px; font-size: 10.5px; color: #566571; }
  .pdf-meta { margin: 0 0 8px; font-size: 10.5px; color: #566571; }
  .pdf-pre {
    margin: 0; white-space: pre-wrap; word-break: break-word; font: 11px/1.5 "IBM Plex Sans", system-ui, sans-serif;
    padding: 10px 12px; border: 1px solid #e9e3d6; border-radius: 6px; background: #faf8f2;
  }
  .pdf-ia {
    margin-top: 4px;
    padding: 14px 14px 12px;
    border: 1px solid #c5d4e0;
    border-radius: 8px;
    background: #f5f8fb;
    page-break-inside: auto;
  }
  .pdf-ia > h2, .pdf-ia-head h2 {
    border-bottom-color: #c5d4e0;
    color: #2f4a5e;
  }
  .pdf-ia-head {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    margin-bottom: 6px;
  }
  .pdf-ia-head h2 { margin: 0; flex: 1; padding-bottom: 4px; border-bottom: 1px solid #c5d4e0;
    font: 600 12px/1.3 "IBM Plex Sans", system-ui, sans-serif;
    text-transform: uppercase; letter-spacing: .05em; color: #2f4a5e;
  }
  .pdf-ia-pill {
    display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 4px;
    font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
    border: 1px solid #c5d4e0; background: #fff; color: #2f4a5e; white-space: nowrap;
  }
  .pdf-ia-pill-ok { border-color: #c9e0a8; background: #eef6e4; color: #4d7019; }
  .pdf-ia-pill-err { border-color: #e5bcbc; background: #faf2f2; color: #7a2e2e; }
  .pdf-ia-pill-mute { border-color: #ded7c6; background: #faf8f2; color: #7b8891; }
  .pdf-ia-meta-bar {
    display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0 0 12px;
    padding: 8px 10px; border-radius: 6px; background: #fff; border: 1px solid #d7e2ea;
    font-size: 10.5px; color: #566571;
  }
  .pdf-ia-meta-bar strong { color: #0d1f2a; font-weight: 600; }
  .pdf-ia-veredito {
    display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 8px;
    margin: 0 0 12px; padding: 10px 12px; border-radius: 6px; border: 1px solid #c5d4e0; background: #fff;
  }
  .pdf-ia-veredito-label {
    display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em;
    color: #566571; font-weight: 600; margin-bottom: 3px;
  }
  .pdf-ia-veredito strong { font-size: 12.5px; color: #0d1f2a; line-height: 1.3; }
  .pdf-ia-veredito-mais_barato { border-color: #c9e0a8; background: #f4faec; }
  .pdf-ia-veredito-mais_barato strong { color: #4d7019; }
  .pdf-ia-veredito-alinhado { border-color: #c5d4e0; background: #eef3f7; }
  .pdf-ia-veredito-alinhado strong { color: #2f4a5e; }
  .pdf-ia-veredito-mais_caro { border-color: #e5bcbc; background: #faf2f2; }
  .pdf-ia-veredito-mais_caro strong { color: #7a2e2e; }
  .pdf-ia-veredito-indeterminado { border-color: #ded7c6; background: #faf8f2; }
  .pdf-ia-bloco { margin: 0 0 12px; }
  .pdf-ia-bloco h3 {
    margin: 0 0 7px; font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .04em; color: #2f4a5e;
  }
  .pdf-kpi-ia { gap: 10px; }
  .pdf-kpi-ia div {
    flex: 1; min-width: 110px; padding: 10px 12px; background: #fff; border-color: #d7e2ea;
  }
  .pdf-kpi-destaque { border-color: #6e9e28 !important; background: #eef6e4 !important; }
  .pdf-ia-texto {
    margin: 0; padding: 10px 12px; border-radius: 6px; border: 1px solid #d7e2ea;
    background: #fff; white-space: pre-wrap; word-break: break-word; line-height: 1.55; font-size: 11.5px;
  }
  .pdf-ia-achados { display: flex; flex-direction: column; gap: 8px; }
  .pdf-ia-achado {
    border: 1px solid #d7e2ea; border-radius: 6px; background: #fff; overflow: hidden;
    page-break-inside: avoid;
  }
  .pdf-ia-achado header {
    display: grid; grid-template-columns: 28px 1fr auto; gap: 10px; align-items: center;
    padding: 8px 10px; background: #eef3f7; border-bottom: 1px solid #d7e2ea;
  }
  .pdf-ia-achado-n {
    width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
    background: #2f4a5e; color: #fff; font-size: 10px; font-weight: 700;
  }
  .pdf-ia-achado-title strong { display: block; font-size: 12px; color: #0d1f2a; }
  .pdf-ia-achado-title span { display: block; font-size: 10px; color: #566571; margin-top: 1px; }
  .pdf-ia-achado-preco { text-align: right; }
  .pdf-ia-achado-preco span { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .03em; color: #566571; font-weight: 600; }
  .pdf-ia-achado-preco strong { display: block; font: 700 13px/1.2 "Source Serif 4", Georgia, serif; color: #0d1f2a; }
  .pdf-ia-achado-body {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; padding: 9px 10px 10px;
  }
  .pdf-ia-achado-body > div:first-child { grid-column: 1 / -1; }
  .pdf-ia-achado-body span {
    display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .03em;
    color: #566571; font-weight: 600; margin-bottom: 2px;
  }
  .pdf-ia-achado-body p { margin: 0; font-size: 11px; line-height: 1.4; word-break: break-word; }
  .pdf-ia-url { font-size: 10px !important; color: #35617f; word-break: break-all; }
  .pdf-ia-fontes { margin: 0; padding-left: 18px; }
  .pdf-ia-fontes li { margin: 0 0 4px; font-size: 11px; line-height: 1.4; }
  .pdf-ia-block-err {
    padding: 10px 12px; border-radius: 6px; border: 1px solid #e5bcbc; background: #faf2f2;
  }
  .pdf-ia-block-err h3 { margin: 0 0 6px; color: #7a2e2e; }
  .pdf-ia-block-err p { margin: 0; }
  .pdf-pre-ia { background: #fff; border-color: #d7e2ea; font-size: 10.5px; max-height: none; }
  .pdf-foot {
    margin-top: 18px; padding-top: 10px; border-top: 1px solid #ded7c6;
    font-size: 9.5px; color: #7b8891; line-height: 1.45;
  }
  .pdf-toolbar {
    position: sticky; top: 0; z-index: 5; display: flex; gap: 8px; justify-content: flex-end;
    padding: 10px 0 12px; background: #fff; border-bottom: 1px solid #e9e3d6; margin-bottom: 12px;
  }
  .pdf-toolbar button {
    font: 600 12px/1 "IBM Plex Sans", system-ui, sans-serif;
    padding: 8px 14px; border-radius: 7px; cursor: pointer; border: 1px solid #ded7c6; background: #fff; color: #0d1f2a;
  }
  .pdf-toolbar .primary { background: #6e9e28; border-color: #6e9e28; color: #fff; }
  @media print {
    .pdf-toolbar { display: none !important; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
  @media (max-width: 720px) {
    .pdf-id, .pdf-metrics, .pdf-grid-2, .pdf-ia-veredito, .pdf-ia-achado-body { grid-template-columns: 1fr; }
    .pdf-ia-achado header { grid-template-columns: 28px 1fr; }
    .pdf-ia-achado-preco { text-align: left; grid-column: 2; }
  }
</style>
</head>
<body>
  <div class="pdf-wrap">
    <div class="pdf-toolbar">
      <button type="button" class="primary" onclick="window.print()">Salvar / imprimir PDF</button>
      <button type="button" onclick="window.close()">Fechar</button>
    </div>
    <header class="pdf-head">
      <img class="pdf-logo" src="${esc(location.origin)}/static/logo_oficial_udi.png" alt="Observatório Social do Brasil — Uberlândia" />
      <div class="pdf-brand">
        <p class="pdf-brand-eyebrow">Observatório Social do Brasil · Uberlândia</p>
        <h1>Relatório de análise de preço</h1>
      </div>
      <div class="pdf-meta-head">
        <div>${esc(tituloDoc)}</div>
        <div>Gerado em ${esc(geradoEm)}</div>
        ${usuario ? `<div>Usuário: ${esc(usuario)}</div>` : ""}
      </div>
    </header>

    ${data.leitura ? `<p class="pdf-lead">${esc(data.leitura)}</p>` : ""}

    <div class="pdf-id">
      <div><span>Compra / modalidade</span><strong>${esc(propPdfTxt(ct.numero))}${ct.modalidade_descricao ? ` · ${esc(ct.modalidade_descricao)}` : ""}</strong></div>
      <div><span>Processo / ano</span><strong>${esc(propPdfTxt(ct.processo))}${ct.ano ? ` · ${esc(String(ct.ano))}` : ""}</strong></div>
      <div><span>Unidade</span><strong>${esc(propPdfTxt(ct.unidade_nome))}</strong></div>
      <div><span>Prazo restante</span><strong>${esc(fmtPrazoRestante(ct.horas_restantes))} · ${esc(urgMap[ct.urgencia] || ct.urgencia || "—")}</strong></div>
      <div><span>Encerramento PNCP</span><strong>${esc(propPdfTxt(ct.data_encerramento_proposta_pncp))}</strong></div>
      <div><span>Vs. mediana local</span><strong>${esc(propPdfTxt(data.desvio_preco?.percentual_fmt))}</strong></div>
    </div>

    <section class="pdf-sec">
      <h2>Dados do item</h2>
      <div class="pdf-desc"><strong>Descrição</strong><br>${esc(desc)}</div>
      <div class="pdf-metrics">
        <div class="pdf-metric"><span>NCM</span><strong>${esc(ncm)}</strong></div>
        <div class="pdf-metric"><span>Qtd</span><strong>${esc(qtd)}</strong></div>
        <div class="pdf-metric"><span>Unitário</span><strong>${esc(propPdfTxt(it.valor_unitario_estimado))}</strong></div>
        <div class="pdf-metric"><span>Total est.</span><strong>${esc(propPdfTxt(it.valor_total))}</strong></div>
      </div>
    </section>

    <div class="pdf-grid-2">
      <section class="pdf-sec">
        <h2>Detalhes do item</h2>
        ${propPdfDl([
          ["Nº item", it.numero_item],
          ["Catálogo", it.cod_item_catalogo != null
            ? `${it.material_ou_servico_nome || ""} ${it.cod_item_catalogo}`.trim()
            : null],
          ["Situação do item", it.situacao_item],
        ])}
      </section>
      <section class="pdf-sec">
        <h2>Prazo e contratação</h2>
        ${propPdfDl([
          ["Encerramento propostas", ct.data_encerramento_proposta_pncp],
          ["Tempo restante", fmtPrazoRestante(ct.horas_restantes)],
          ["Objeto", ct.objeto],
          ["PNCP", ct.link_pncp || null],
        ])}
      </section>
    </div>

    <section class="pdf-sec">
      <h2>Referência de catálogo (base local)</h2>
      ${b ? propPdfDl([
        ["Base da referência", origemBench],
        ["Amostras", b.amostras],
        ["Mínimo", b.minimo_fmt],
        ["Mediana", b.mediana_fmt],
        ["Média", b.media_fmt],
        ["Máximo", b.maximo_fmt],
        ["Desvio do item", data.desvio_preco?.percentual_fmt],
      ]) : '<p class="pdf-empty">Sem amostras locais (catálogo ou mesma descrição).</p>'}
    </section>

    ${propPdfSecaoIa(ia, it)}

    <section class="pdf-sec">
      <h2>Comparáveis na base local</h2>
      <p class="pdf-note">${comps.length
        ? `${comps.length} comparável(is) com ${b?.origem === "descricao" ? "mesma descrição" : "mesmo código de catálogo"}`
        : "Nenhum comparável encontrado na base local."}</p>
      ${propPdfTable(
        ["Compra", "Ano", "Descrição", "Unitário", "Origem"],
        comps.map((c) => [
          c.processo ? `${c.numero_compra || "—"} · ${c.processo}` : (c.numero_compra || "—"),
          c.ano ?? "—",
          c.descricao_resumida || "—",
          c.valor_unitario || "—",
          c.origem_preco || "—",
        ]),
      )}
    </section>

    ${pesquisa.length ? `<section class="pdf-sec">
      <h2>Pesquisa de preço (módulo 03)</h2>
      ${propPdfTable(
        ["Data", "Fornecedor", "Município", "Unitário"],
        pesquisa.map((p) => [
          p.data_compra || "—",
          p.nome_fornecedor || "—",
          [p.municipio, p.estado].filter(Boolean).join("/") || "—",
          p.preco_unitario || "—",
        ]),
      )}
    </section>` : ""}

    <footer class="pdf-foot">
      Documento gerado pelo Observatório de Licitações (OSB Uberlândia) a partir dos dados oficiais
      Compras.gov / PNCP e análises auxiliares locais. A pesquisa de mercado via IA é subsidiária e
      não substitui cotação formal nem prova oficial de preço. Fonte do sistema · página Propostas abertas.
    </footer>
  </div>
</body>
</html>`;
}

function gerarPdfPropItem() {
  if (!propAnaliseSnapshot || !propAnaliseSnapshot.item) {
    const meta = $("#modal-prop-ia-meta");
    if (meta) meta.textContent = "Aguarde o carregamento completo do registro antes de gerar o PDF.";
    return;
  }
  const html = montarHtmlRelatorioProp(propAnaliseSnapshot, propIaUltima || propIaSnapshot);
  if (!html || html.length < 200) {
    const meta = $("#modal-prop-ia-meta");
    if (meta) meta.textContent = "Não foi possível montar o relatório — dados insuficientes.";
    return;
  }

  const tituloParts = [
    propAnaliseSnapshot.item?.numero_item != null
      ? `item-${propAnaliseSnapshot.item.numero_item}`
      : null,
    propAnaliseSnapshot.contratacao?.numero
      ? `compra-${propAnaliseSnapshot.contratacao.numero}`
      : null,
  ].filter(Boolean);
  const nome = `relatorio-preco-${tituloParts.join("-") || propItemAtual || "item"}`;

  const w = window.open("", "_blank");
  if (!w) {
    const meta = $("#modal-prop-ia-meta");
    if (meta) meta.textContent = "Permita pop-ups deste site para abrir o relatório PDF.";
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  try { w.document.title = nome; } catch (_) { /* ignore */ }

  const tentarImprimir = () => {
    try {
      w.focus();
      w.print();
    } catch (err) {
      console.error("PDF propostas:", err);
    }
  };
  // Aguarda renderização do HTML (evita página em branco comum com print imediato)
  if (w.document.readyState === "complete") {
    setTimeout(tentarImprimir, 250);
  } else {
    w.addEventListener("load", () => setTimeout(tentarImprimir, 250));
    setTimeout(tentarImprimir, 800);
  }
}

async function carregarPropFiltros() {
  if (propFiltrosProntos) return;
  const [unidades, mods] = await Promise.all([
    api("/api/compras/unidades").catch(() => []),
    api("/api/compras/modalidades").catch(() => []),
  ]);
  const selU = $("#prop-filtro-unidade");
  if (selU) {
    selU.innerHTML = '<option value="">Todas</option>' +
      (unidades || []).map((u) =>
        `<option value="${esc(u.codigo)}">${esc(u.codigo)} · ${esc(u.nome)}</option>`
      ).join("");
  }
  multiSelectOf("#prop-filtro-modalidade")?.setOptions(
    (mods || []).map((m) => ({
      value: String(m.codigo),
      label: `${m.codigo} · ${m.nome}`,
    })),
  );
  propFiltrosProntos = true;
}

function renderPropResumo(resumo) {
  const el = $("#prop-resumo");
  if (!el) return;
  if (!resumo || !resumo.itens) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  const chips = [
    { n: fmtNum(resumo.contratacoes), l: "Contratações" },
    { n: fmtNum(resumo.itens), l: "Itens" },
    { n: resumo.valor_estimado_total_fmt || fmtMoeda(resumo.valor_estimado_total), l: "Valor estimado" },
    { n: fmtNum(resumo.urgentes_72h), l: "Até 72h", urg: "alta" },
    { n: fmtNum(resumo.urgentes_24h), l: "Até 24h", urg: "critica" },
  ];
  el.innerHTML = `
    <p class="prop-resumo-label">Síntese do recorte</p>
    <div class="prop-chips">
      ${chips.map((c) => `
        <div class="prop-chip${c.urg ? ` prop-chip-${c.urg}` : ""}">
          <span class="prop-chip-n">${c.n}</span>
          <span class="prop-chip-l">${esc(c.l)}</span>
        </div>`).join("")}
    </div>`;
}

function renderPropTabela() {
  const tb = $("#prop-tabela");
  const head = $("#prop-tabela-head");
  if (!tb) return;
  try {
    if (!propLastItems.length) {
      tb.innerHTML = '<tr><td colspan="12">Nenhum item com prazo de proposta ainda aberto para os filtros. Tente <strong>Todos abertos</strong> e clique em Limpar.</td></tr>';
      return;
    }
    let items = propLastItems;
    if (propSortKey && PROP_SORT_GETTERS[propSortKey]) {
      items = sortItems(propLastItems, PROP_SORT_GETTERS[propSortKey], propSortDir);
    }
    markSortableHeaders(head, propSortKey ? { key: propSortKey, dir: propSortDir } : null);
    tb.innerHTML = items.map((r) => {
      const desc = r.descricao_resumida || r.descricao_detalhada || "—";
      const ncm = r.codigo_ncm || "—";
      const ncmTitle = r.descricao_ncm
        ? `${r.codigo_ncm} · ${r.descricao_ncm}`
        : (r.codigo_ncm || "NCM não informado");
      const qtd = [r.quantidade, r.unidade_medida].filter(Boolean).join(" ");
      const compra = r.numero_compra || "—";
      const mod = r.modalidade_descricao || "";
      return `<tr class="clickable" data-item-id="${esc(String(r.item_id))}" data-contratacao-id="${esc(String(r.contratacao_id || ""))}" title="Clique para abrir análise de preço">
      ${tdEllipsis("", { cls: "col-analise-ia", html: pillAnaliseIa(r.analise_ia), title: tituloAnaliseIa(r.analise_ia) })}
      ${tdEllipsis(fmtPrazoRestante(r.horas_restantes), {
        html: `${pillUrgencia(r.urgencia, r.horas_restantes)} <span class="prop-prazo-txt">${esc(r.data_encerramento_proposta_pncp || "")}</span>`,
        title: `${r.data_encerramento_proposta_pncp || ""} · ${fmtPrazoRestante(r.horas_restantes)}`,
      })}
      ${tdEllipsis(compra, {
        html: `<strong>${esc(compra)}</strong>${mod ? ` <span class="pill-mod">${esc(mod)}</span>` : ""}`,
        title: mod ? `${compra} · ${mod}` : String(compra),
      })}
      ${tdEllipsis(r.processo)}
      ${tdEllipsis(r.numero_item, { cls: "col-num" })}
      ${tdEllipsis(desc, { cls: "col-desc" })}
      ${tdEllipsis(ncm, { cls: "col-num", title: ncmTitle })}
      ${tdEllipsis(qtd || "—", { cls: "col-num" })}
      ${tdEllipsis(r.valor_unitario_estimado, { cls: "col-num col-money" })}
      ${tdEllipsis(r.valor_total, { cls: "col-num col-money" })}
      ${tdEllipsis(r.desvio_preco?.percentual_fmt, { cls: "col-num", html: pillDesvio(r.desvio_preco) })}
      ${tdEllipsis(r.unidade_nome)}
    </tr>`;
    }).join("");

    tb.querySelectorAll("tr[data-item-id]").forEach((tr) => {
      tr.addEventListener("click", () => {
        abrirAnalisePropItem(tr.dataset.itemId);
      });
    });
  } catch (err) {
    console.error("renderPropTabela", err);
    tb.innerHTML = `<tr><td colspan="12">Erro ao montar a tabela: ${esc(err.message || err)}</td></tr>`;
  }
}

async function buscarPropostas() {
  const tb = $("#prop-tabela");
  const meta = $("#prop-consulta-meta");
  if (tb) tb.innerHTML = '<tr><td colspan="12">Carregando itens com proposta aberta…</td></tr>';
  try {
    const params = propParams();
    const [data, resumo] = await Promise.all([
      api(`/api/propostas-abertas/itens?${params}`),
      api(`/api/propostas-abertas/resumo?${params}`),
    ]);
    propLastItems = Array.isArray(data?.items) ? data.items : [];
    const aviso = data?.aviso ? ` · ${data.aviso}` : "";
    if (meta) {
      meta.textContent = `${fmtNum(data?.total ?? propLastItems.length)} item(ns) com prazo aberto${aviso}`;
    }
    renderPropResumo(resumo);
    renderPropTabela();
  } catch (err) {
    propLastItems = [];
    if (meta) meta.textContent = "";
    renderPropResumo(null);
    if (tb) {
      tb.innerHTML = `<tr><td colspan="12">Falha ao carregar: ${esc(err.message)}. Faça login novamente ou clique em Buscar.</td></tr>`;
    }
  }
}

function propDl(campos) {
  return campos
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`)
    .join("") || "<dt>Info</dt><dd class='muted-empty'>—</dd>";
}

function renderPropCamposChave(it, camposIa) {
  const el = $("#modal-prop-campos-chave");
  if (!el) return;
  const c = camposIa || {};
  const desc = c.descricao || it.descricao_detalhada || it.descricao_resumida || "—";
  const ncm = c.ncm || (it.codigo_ncm
    ? (it.descricao_ncm ? `${it.codigo_ncm} — ${it.descricao_ncm}` : it.codigo_ncm)
    : "—");
  const qtd = c.qtd || [it.quantidade, it.unidade_medida].filter(Boolean).join(" ") || "—";
  const unit = c.valor_unitario || it.valor_unitario_estimado || "—";
  const total = c.total_estimado || it.valor_total || "—";
  el.innerHTML = `
    <div class="prop-campo prop-campo-desc">
      <span class="prop-campo-label">Descrição</span>
      <span class="prop-campo-valor">${esc(desc)}</span>
    </div>
    <div class="prop-campos-metricas">
      <div class="prop-campo prop-campo-ncm">
        <span class="prop-campo-label">NCM</span>
        <span class="prop-campo-valor">${esc(ncm)}</span>
      </div>
      <div class="prop-campo prop-campo-metric">
        <span class="prop-campo-label">Qtd</span>
        <span class="prop-campo-valor"><strong>${esc(qtd)}</strong></span>
      </div>
      <div class="prop-campo prop-campo-metric">
        <span class="prop-campo-label">Unitário</span>
        <span class="prop-campo-valor"><strong>${esc(unit)}</strong></span>
      </div>
      <div class="prop-campo prop-campo-metric">
        <span class="prop-campo-label">Total est.</span>
        <span class="prop-campo-valor"><strong>${esc(total)}</strong></span>
      </div>
    </div>`;
}

function fmtFaixaMoeda(n) {
  if (n == null || n === "") return "—";
  return fmtMoeda(n);
}

function renderPropIaResultado(analise) {
  const box = $("#modal-prop-ia-resultado");
  if (!box) return;
  propIaSnapshot = analise || null;
  if (!analise) {
    box.hidden = true;
    box.innerHTML = "";
    box.classList.remove("err");
    return;
  }
  box.hidden = false;
  const ok = analise.status === "ok";
  box.classList.toggle("err", !ok);
  if (!ok) {
    box.innerHTML = `
      <p class="prop-ia-resultado-meta">
        <span class="prop-ia-status-erro">Erro</span>
        ${analise.criado_em ? ` · ${esc(analise.criado_em)}` : ""}
        ${analise.provedor_nome ? ` · ${esc(analise.provedor_nome)}` : ""}
      </p>
      <p class="prop-ia-texto">${esc(analise.erro || "Falha na busca de preços de mercado.")}</p>`;
    return;
  }

  const est = analise.resposta_estruturada || {};
  const faixa = est.faixa_unitario || {};
  const comp = est.comparativo || "";
  const compLabel = PROP_COMP_LABEL[comp] || "";
  const metaParts = [
    analise.criado_em,
    analise.provedor_nome,
    analise.modelo,
  ].filter(Boolean);

  let faixaHtml = "";
  if (faixa.minimo != null || faixa.tipico != null || faixa.maximo != null) {
    faixaHtml = `<div class="prop-ia-faixa">
      <div class="prop-ia-faixa-chip"><span>Mín.</span><strong>${fmtFaixaMoeda(faixa.minimo)}</strong></div>
      <div class="prop-ia-faixa-chip"><span>Típico</span><strong>${fmtFaixaMoeda(faixa.tipico)}</strong></div>
      <div class="prop-ia-faixa-chip"><span>Máx.</span><strong>${fmtFaixaMoeda(faixa.maximo)}</strong></div>
    </div>`;
  }

  const desvio = est.desvio_percentual_aprox;
  const desvioHtml = desvio != null && Number.isFinite(Number(desvio))
    ? `<p class="prop-ia-desvio">Desvio aproximado vs. processo: <strong>${Number(desvio) > 0 ? "+" : ""}${esc(String(Number(desvio)))}%</strong></p>`
    : "";

  const achados = Array.isArray(est.achados) ? est.achados : [];
  let achadosHtml = "";
  if (achados.length) {
    const tipoLabel = {
      marketplace: "Marketplace",
      varejo: "Varejo",
      atacado_b2b: "Atacado / B2B",
      painel_publico: "Painel público",
      catalogo: "Catálogo",
      fabricante: "Fabricante",
      outro: "Outro",
    };
    const rows = achados.map((a) => {
      const site = a?.site || "—";
      const tipo = tipoLabel[a?.tipo] || a?.tipo || "—";
      const preco = a?.preco_unitario != null ? fmtFaixaMoeda(a.preco_unitario) : "—";
      const produto = a?.produto || "—";
      const ref = a?.referencia_data || "";
      const nota = a?.nota || "";
      const url = (a?.url && String(a.url).trim()) || "";
      const urlCell = url && /^https?:\/\//i.test(url)
        ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="prop-ia-achado-link">Abrir</a>`
        : `<span class="muted-inline">${esc(url || "—")}</span>`;
      const detalhe = [ref, nota].filter(Boolean).join(" · ");
      return `<tr>
        <td><strong>${esc(site)}</strong><br><span class="prop-ia-achado-tipo">${esc(tipo)}</span></td>
        <td class="col-num">${esc(preco)}</td>
        <td>${esc(produto)}${detalhe ? `<br><span class="muted-inline">${esc(detalhe)}</span>` : ""}</td>
        <td>${urlCell}</td>
      </tr>`;
    }).join("");
    achadosHtml = `
      <div class="prop-ia-achados">
        <h5 class="prop-ia-achados-titulo">Sites e preços encontrados</h5>
        <div class="table-wrap prop-ia-achados-scroll">
          <table class="data-table prop-ia-achados-table">
            <thead>
              <tr>
                <th>Site / fonte</th>
                <th class="col-num">Preço unit.</th>
                <th>Produto / oferta</th>
                <th>Referência</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  const textoVisivel = est.resumo_item
    ? [
        est.resumo_item,
        est.observacoes ? `\n\nObservações: ${est.observacoes}` : "",
        Array.isArray(est.fontes) && est.fontes.length
          ? `\n\nFontes: ${est.fontes.join("; ")}`
          : "",
      ].join("")
    : (analise.resposta_texto || "—");

  const bruto = analise.resposta_texto && est.resumo_item
    ? `<details class="prop-prompt-wrap"><summary>Resposta completa da IA</summary><pre class="prop-ia-texto">${esc(analise.resposta_texto)}</pre></details>`
    : "";

  box.innerHTML = `
    <p class="prop-ia-resultado-meta">
      <span class="prop-ia-status-ok">Concluída</span>
      ${metaParts.length ? ` · ${esc(metaParts.join(" · "))}` : ""}
    </p>
    ${compLabel ? `<span class="prop-ia-comparativo prop-ia-comp-${esc(comp)}">${esc(compLabel)}</span>` : ""}
    ${faixaHtml}
    ${desvioHtml}
    ${achadosHtml}
    <pre class="prop-ia-texto">${esc(textoVisivel)}</pre>
    ${bruto}`;
}

function renderPropIaHistorico(historico) {
  const wrap = $("#modal-prop-ia-historico-wrap");
  const ul = $("#modal-prop-ia-historico");
  if (!wrap || !ul) return;
  const lista = Array.isArray(historico) ? historico : [];
  if (!lista.length) {
    wrap.hidden = true;
    ul.innerHTML = "";
    return;
  }
  wrap.hidden = false;
  ul.innerHTML = lista.map((a) => {
    const stCls = a.status === "ok"
      ? "prop-ia-status-ok"
      : (a.status === "erro" ? "prop-ia-status-erro" : "prop-ia-status-pendente");
    const stLabel = a.status === "ok" ? "ok" : (a.status === "erro" ? "erro" : a.status || "—");
    return `<li data-analise-id="${a.id}">
      <span class="${stCls}">${esc(stLabel)}</span>
      <span>${esc(a.criado_em || "—")}</span>
      <span class="muted-inline">${esc(a.provedor_nome || a.modelo || "—")}</span>
      <button type="button" class="btn ghost btn-prop-ver-analise">Ver</button>
    </li>`;
  }).join("");
  ul.querySelectorAll(".btn-prop-ver-analise").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.closest("li")?.dataset.analiseId);
      const found = lista.find((x) => x.id === id);
      if (found) renderPropIaResultado(found);
    });
  });
}

function resetPropIaPainel() {
  propMercadoPrompt = "";
  const promptEl = $("#modal-prop-prompt");
  if (promptEl) promptEl.textContent = "";
  const wrap = $("#modal-prop-prompt-wrap");
  if (wrap) wrap.open = false;
  const meta = $("#modal-prop-ia-meta");
  if (meta) meta.textContent = "";
  renderPropIaResultado(null);
  renderPropIaHistorico([]);
  const btn = $("#btn-prop-buscar-mercado");
  if (btn) {
    const admin = propEhAdmin();
    btn.hidden = false;
    btn.disabled = !admin;
    btn.title = admin
      ? "Consulta preços de mercado via tokens ativos do Setup"
      : "Somente administradores podem disparar a busca";
    btn.textContent = "Buscar preços de mercado";
  }
}

async function carregarPropMercadoIa(itemId) {
  const meta = $("#modal-prop-ia-meta");
  try {
    const data = await api(`/api/propostas-abertas/itens/${itemId}/mercado-ia`);
    propMercadoPrompt = data.prompt_previsto || "";
    const promptEl = $("#modal-prop-prompt");
    if (promptEl) promptEl.textContent = propMercadoPrompt;
    if (data.aviso && $("#modal-prop-ia-aviso")) {
      $("#modal-prop-ia-aviso").textContent =
        `${data.aviso} Utiliza os tokens ativos cadastrados em Setup → Provedores de IA (com rotação automática).`;
    }
    renderPropCamposChave(
      propLastItems.find((r) => String(r.item_id) === String(itemId)) || {},
      data.campos,
    );
    renderPropIaHistorico(data.historico || []);
    if (data.ultima) {
      propIaUltima = data.ultima;
      renderPropIaResultado(data.ultima);
      if (meta) {
        meta.textContent = data.historico?.length
          ? `${data.historico.length} análise(s) registrada(s)`
          : "";
      }
    } else {
      propIaUltima = null;
      if (meta) {
        meta.textContent = propEhAdmin()
          ? "Nenhuma busca ainda — use o botão para consultar o mercado via IA."
          : "Nenhuma análise registrada para este item.";
      }
    }
  } catch (err) {
    if (meta) meta.textContent = err.message || "Falha ao carregar análises de IA.";
  }
}

async function buscarPrecoMercadoIa() {
  if (!propItemAtual || propMercadoBusy) return;
  if (!propEhAdmin()) {
    const meta = $("#modal-prop-ia-meta");
    if (meta) meta.textContent = "Somente administradores podem disparar a busca.";
    return;
  }
  propMercadoBusy = true;
  const btn = $("#btn-prop-buscar-mercado");
  const meta = $("#modal-prop-ia-meta");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Consultando IA…";
  }
  if (meta) meta.textContent = "Enviando prompt com Descrição, NCM, Qtd, Unitário e Total est.…";
  try {
    const analise = await api(`/api/propostas-abertas/itens/${propItemAtual}/mercado-ia`, {
      method: "POST",
      body: "{}",
    });
    renderPropIaResultado(analise);
    if (analise) propIaUltima = analise;
    atualizarAnaliseIaTabela(propItemAtual, analise);
    await carregarPropMercadoIa(propItemAtual);
    if (meta) {
      meta.textContent = analise.status === "ok"
        ? `Busca concluída via ${analise.provedor_nome || "IA"}${analise.modelo ? ` · ${analise.modelo}` : ""}.`
        : (analise.erro || "Busca finalizada com erro — item original intacto.");
    }
  } catch (err) {
    if (meta) meta.textContent = err.message || "Falha na busca.";
    renderPropIaResultado({
      status: "erro",
      erro: err.message || "Falha na busca de preços de mercado.",
      criado_em: new Date().toISOString().slice(0, 19),
    });
  } finally {
    propMercadoBusy = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Buscar preços de mercado";
    }
  }
}

async function abrirAnalisePropItem(itemId) {
  propItemAtual = itemId;
  propAnaliseSnapshot = null;
  propIaSnapshot = null;
  propIaUltima = null;
  propPdfBtnSet(false, "Aguarde o carregamento do registro");
  const modal = $("#modal-prop-item");
  if (!modal || typeof modal.showModal !== "function") {
    console.error("Modal de propostas não encontrado");
    return;
  }
  const setTxt = (sel, v) => { const el = $(sel); if (el) el.textContent = v ?? ""; };
  const setHtml = (sel, v) => { const el = $(sel); if (el) el.innerHTML = v ?? ""; };

  setTxt("#modal-prop-titulo", "Análise de preço");
  setHtml("#modal-prop-resumo", "<p class='muted'>Carregando…</p>");
  setTxt("#modal-prop-leitura", "");
  setHtml("#modal-prop-dados-item", "");
  setHtml("#modal-prop-contratacao", "");
  setHtml("#modal-prop-benchmark", "");
  setHtml("#modal-prop-comparaveis", "");
  setTxt("#modal-prop-comp-meta", "");
  const pesquisaWrap = $("#modal-prop-pesquisa-wrap");
  if (pesquisaWrap) pesquisaWrap.hidden = true;
  resetPropIaPainel();
  renderPropCamposChave({}, null);
  if (!modal.open) modal.showModal();

  try {
    const [data] = await Promise.all([
      api(`/api/propostas-abertas/itens/${itemId}/analise-preco`),
      carregarPropMercadoIa(itemId),
    ]);
    if (!data || !data.item) {
      throw new Error("Registro sem dados de item — não foi possível montar a análise.");
    }
    propAnaliseSnapshot = data;
    propPdfBtnSet(true);

    const it = data.item || {};
    const ct = data.contratacao || {};
    const tituloParts = [
      it.numero_item != null && it.numero_item !== "" ? `Item ${it.numero_item}` : null,
      ct.numero ? `Compra ${ct.numero}` : null,
    ].filter(Boolean);
    setTxt("#modal-prop-titulo", tituloParts.length ? tituloParts.join(" · ") : "Análise de preço");
    setHtml("#modal-prop-resumo", `
      <div class="compra-resumo-main">
        <span class="compra-resumo-num">${esc(ct.numero || "—")}</span>
        ${ct.modalidade_descricao ? `<span class="pill-mod">${esc(ct.modalidade_descricao)}</span>` : ""}
        ${ct.urgencia ? pillUrgencia(ct.urgencia, ct.horas_restantes) : ""}
        ${data.desvio_preco ? pillDesvio(data.desvio_preco) : ""}
      </div>
      <div class="compra-resumo-sub">${esc(ct.unidade_nome || "")}${ct.ano ? ` · ${ct.ano}` : ""}${ct.processo ? ` · proc. ${esc(ct.processo)}` : ""}</div>`);
    setTxt("#modal-prop-leitura", data.leitura || "");

    renderPropCamposChave(it, null);

    setHtml("#modal-prop-dados-item", propDl([
      ["Nº item", it.numero_item],
      ["NCM", it.codigo_ncm
        ? (it.descricao_ncm ? `${it.codigo_ncm} — ${it.descricao_ncm}` : it.codigo_ncm)
        : null],
      ["Catálogo", it.cod_item_catalogo != null
        ? `${it.material_ou_servico_nome || ""} ${it.cod_item_catalogo}`.trim()
        : null],
      ["Quantidade", [it.quantidade, it.unidade_medida].filter(Boolean).join(" ")],
      ["Unitário estimado", it.valor_unitario_estimado],
      ["Total estimado", it.valor_total],
      ["Situação do item", it.situacao_item],
      ["Descrição", it.descricao_detalhada || it.descricao_resumida],
    ].map(([k, v]) => [k, v != null && v !== "" ? esc(v) : null])));

    setHtml("#modal-prop-contratacao", propDl([
      ["Encerramento propostas", ct.data_encerramento_proposta_pncp],
      ["Tempo restante", fmtPrazoRestante(ct.horas_restantes)],
      ["Objeto", ct.objeto],
      ["PNCP", ct.link_pncp
        ? `<a href="${esc(ct.link_pncp)}" target="_blank" rel="noopener" class="link-pncp">Abrir no PNCP</a>`
        : null],
    ]));

    const b = data.benchmark_catalogo;
    if (b) {
      const origem = b.origem === "descricao" ? "Mesma descrição" : "Código de catálogo";
      setHtml("#modal-prop-benchmark", propDl([
        ["Base da referência", origem],
        ["Amostras", b.amostras],
        ["Mínimo", b.minimo_fmt],
        ["Mediana", b.mediana_fmt],
        ["Média", b.media_fmt],
        ["Máximo", b.maximo_fmt],
        ["Desvio do item", data.desvio_preco?.percentual_fmt],
      ].map(([k, v]) => [k, v != null && v !== "" ? esc(v) : null])));
    } else {
      setHtml("#modal-prop-benchmark",
        "<dt>Referência</dt><dd class='muted-empty'>Sem amostras locais (catálogo ou mesma descrição).</dd>");
    }

    const comps = data.comparaveis || [];
    const baseComp = b?.origem === "descricao" ? "mesma descrição" : "mesmo código de catálogo";
    setTxt("#modal-prop-comp-meta", comps.length
      ? `${comps.length} comparável(is) com ${baseComp}`
      : "Nenhum comparável encontrado na base local.");
    setHtml("#modal-prop-comparaveis", comps.length
      ? comps.map((c) => `<tr>
          <td>${esc(c.numero_compra || "—")}${c.processo ? `<div class="muted-inline">${esc(c.processo)}</div>` : ""}</td>
          <td>${esc(c.ano ?? "—")}</td>
          <td class="col-desc" title="${esc(c.descricao_resumida || "")}">${esc(c.descricao_resumida || "—")}</td>
          <td class="col-num">${esc(c.valor_unitario || "—")}</td>
          <td>${esc(c.origem_preco || "—")}</td>
        </tr>`).join("")
      : '<tr><td colspan="5">—</td></tr>');

    const pesquisa = data.pesquisa_preco || [];
    const wrap = $("#modal-prop-pesquisa-wrap");
    if (wrap) {
      if (pesquisa.length) {
        wrap.hidden = false;
        setHtml("#modal-prop-pesquisa", pesquisa.map((p) => `<tr>
          <td>${esc(p.data_compra || "—")}</td>
          <td>${esc(p.nome_fornecedor || "—")}</td>
          <td>${esc([p.municipio, p.estado].filter(Boolean).join("/") || "—")}</td>
          <td class="col-num">${esc(p.preco_unitario || "—")}</td>
        </tr>`).join(""));
      } else {
        wrap.hidden = true;
      }
    }

    const btnCompra = $("#btn-prop-abrir-compra");
    if (btnCompra) {
      btnCompra.onclick = () => {
        if (!ct.id) return;
        modal.close();
        if (typeof abrirDetalheCompra === "function") {
          abrirDetalheCompra(ct.id);
        } else {
          irParaPagina("compras");
        }
      };
    }
  } catch (err) {
    console.error("abrirAnalisePropItem", err);
    propAnaliseSnapshot = null;
    propPdfBtnSet(false, "Não foi possível carregar o registro para PDF");
    setHtml("#modal-prop-resumo", `<p class="muted">${esc(err.message)}</p>`);
  }
}

async function carregarPropostasPagina() {
  try {
    await carregarPropFiltros();
  } catch (err) {
    console.error("Filtros de propostas:", err);
  }
  await buscarPropostas();
}

document.addEventListener("DOMContentLoaded", () => {
  $("#form-prop-filtros")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    buscarPropostas();
  });
  $("#btn-prop-limpar")?.addEventListener("click", () => {
    const h = $("#prop-filtro-horizonte");
    if (h) h.value = "todos";
    const uni = $("#prop-filtro-unidade");
    if (uni) uni.value = "";
    multiSelectOf("#prop-filtro-modalidade")?.clear({ silent: true });
    const tipo = $("#prop-filtro-tipo");
    if (tipo) tipo.value = "";
    const ia = $("#prop-filtro-ia");
    if (ia) ia.value = "todos";
    const texto = $("#prop-filtro-texto");
    if (texto) texto.value = "";
    buscarPropostas();
  });
  $("#modal-prop-fechar")?.addEventListener("click", () => $("#modal-prop-item")?.close());
  $("#btn-prop-gerar-pdf")?.addEventListener("click", () => gerarPdfPropItem());
  $("#btn-prop-buscar-mercado")?.addEventListener("click", () => buscarPrecoMercadoIa());
  $("#btn-prop-ver-prompt")?.addEventListener("click", () => {
    const wrap = $("#modal-prop-prompt-wrap");
    if (!wrap) return;
    wrap.open = !wrap.open;
    if (wrap.open && !$("#modal-prop-prompt")?.textContent && propMercadoPrompt) {
      $("#modal-prop-prompt").textContent = propMercadoPrompt;
    }
  });
  wireSortableHeaders($("#prop-tabela-head"), (key, dir) => {
    propSortKey = key;
    propSortDir = dir;
    renderPropTabela();
  });
});

registrarPagina("propostas", carregarPropostasPagina);
