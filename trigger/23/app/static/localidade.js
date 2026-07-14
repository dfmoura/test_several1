/* ============================================================
   localidade.js — Mapa de distribuição geográfica dos vencedores
   Coroplético por UF + calor por município (valor / quantidade)
   ============================================================ */

const LOC = {
  map: null,
  geoLayer: null,
  heatLayer: null,
  bubbleLayer: null,
  geojson: null,
  centroids: null,
  ufCentroids: null,
  data: null,
  mode: "estados",
  ufFocus: null,
  municipios: [],
  ready: false,
};

const LOC_PALETTE = [
  "#f2f5e8",
  "#d4e8b5",
  "#b4d574",
  "#91c649",
  "#6e9e28",
  "#3d5f14",
];

function locMetrica() {
  return $("#loc-filtro-metrica")?.value === "valor" ? "valor" : "quantidade";
}

function locValorDe(item) {
  const m = locMetrica();
  return Number(item?.[m] ?? 0) || 0;
}

function locCorEscala(t) {
  const x = Math.max(0, Math.min(1, t));
  const idx = x <= 0 ? 0 : Math.min(LOC_PALETTE.length - 1, Math.ceil(x * (LOC_PALETTE.length - 1)));
  return LOC_PALETTE[idx];
}

function locNorm(v, max) {
  if (!max || max <= 0 || !v) return 0;
  // escala suavizada — evita que um outlier apague o restante
  return Math.sqrt(v / max);
}

function locFmtMetrica(v) {
  return locMetrica() === "valor" ? fmtMoeda(v) : fmtNum(v);
}

/* -------------------- bootstrap mapa -------------------- */

async function locEnsureAssets() {
  if (LOC.geojson && LOC.centroids) return;
  const [geo, cents, ufCents] = await Promise.all([
    fetch("/static/geo/brasil-ufs.geojson").then((r) => r.json()),
    fetch("/static/geo/municipio-centroids.json").then((r) => r.json()),
    fetch("/static/geo/uf-centroids.json").then((r) => r.json()),
  ]);
  LOC.geojson = geo;
  LOC.centroids = cents;
  LOC.ufCentroids = ufCents;
}

function locInitMap() {
  const el = $("#loc-map");
  if (!el || LOC.map) return;
  LOC.map = L.map(el, {
    zoomControl: true,
    attributionControl: false,
    minZoom: 3,
    maxZoom: 12,
    worldCopyJump: false,
  }).setView([-14.2, -52.5], 4);

  // Fundo discreto — sem tiles satélite; o coroplético é o protagonista
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 18,
    opacity: 0.55,
  }).addTo(LOC.map);

  L.control
    .attribution({ position: "bottomright", prefix: false })
    .addAttribution("Malha UF · Observatório · Carto")
    .addTo(LOC.map);

  setTimeout(() => LOC.map.invalidateSize(), 80);
}

function locClearLayers() {
  if (LOC.geoLayer) {
    LOC.map.removeLayer(LOC.geoLayer);
    LOC.geoLayer = null;
  }
  if (LOC.heatLayer) {
    LOC.map.removeLayer(LOC.heatLayer);
    LOC.heatLayer = null;
  }
  if (LOC.bubbleLayer) {
    LOC.map.removeLayer(LOC.bubbleLayer);
    LOC.bubbleLayer = null;
  }
}

function locByUfMap() {
  const map = {};
  (LOC.data?.por_uf || []).forEach((u) => {
    map[u.uf] = u;
  });
  return map;
}

function locPaintEstados() {
  const byUf = locByUfMap();
  const max = Math.max(...Object.values(byUf).map(locValorDe), 1);

  LOC.geoLayer = L.geoJSON(LOC.geojson, {
    style(feat) {
      const sigla = feat.properties.sigla;
      const row = byUf[sigla];
      const v = row ? locValorDe(row) : 0;
      const focused = !LOC.ufFocus || LOC.ufFocus === sigla;
      return {
        fillColor: v ? locCorEscala(locNorm(v, max)) : "#f3f0e6",
        weight: LOC.ufFocus === sigla ? 2.4 : 1,
        color: LOC.ufFocus === sigla ? "#0d1f2a" : "#c8bfaa",
        fillOpacity: focused ? (v ? 0.88 : 0.35) : 0.12,
        opacity: focused ? 1 : 0.35,
      };
    },
    onEachFeature(feat, layer) {
      const sigla = feat.properties.sigla;
      const nome = feat.properties.nome;
      const row = byUf[sigla];
      const qtd = row?.quantidade ?? 0;
      const valor = row?.valor ?? 0;
      const tip = row
        ? `<strong>${esc(sigla)} · ${esc(nome)}</strong><br>
           Resultados: <b>${fmtNum(qtd)}</b><br>
           Valor: <b>${fmtMoeda(valor)}</b><br>
           Municípios: ${fmtNum(row.municipios)} · Fornecedores: ${fmtNum(row.fornecedores)}`
        : `<strong>${esc(sigla)} · ${esc(nome)}</strong><br><span class="muted">Sem vencedores nos filtros</span>`;
      layer.bindTooltip(tip, { sticky: true, className: "loc-tooltip", opacity: 1 });
      layer.on({
        mouseover(e) {
          e.target.setStyle({ weight: 2.2, color: "#0d1f2a" });
          e.target.bringToFront();
        },
        mouseout(e) {
          LOC.geoLayer.resetStyle(e.target);
        },
        click() {
          locFocarUf(sigla);
        },
      });
    },
  }).addTo(LOC.map);

  locRenderLegend(max);
  locFitBounds();
}

function locPaintCalor() {
  const munis = (LOC.data?.por_municipio || []).filter((m) => {
    if (LOC.ufFocus && m.uf !== LOC.ufFocus) return false;
    return true;
  });
  const max = Math.max(...munis.map(locValorDe), 1);
  const heatPts = [];
  const bubbles = [];

  munis.forEach((m) => {
    const c = m.ibge ? LOC.centroids[String(m.ibge)] : null;
    if (!c) return;
    const v = locValorDe(m);
    if (!v) return;
    const intensity = Math.max(0.15, locNorm(v, max));
    heatPts.push([c[0], c[1], intensity]);
    bubbles.push({ m, c, v, intensity });
  });

  if (typeof L.heatLayer === "function" && heatPts.length) {
    LOC.heatLayer = L.heatLayer(heatPts, {
      radius: 28,
      blur: 22,
      maxZoom: 8,
      minOpacity: 0.35,
      gradient: {
        0.15: "#f2f5e8",
        0.35: "#d4e8b5",
        0.55: "#b4d574",
        0.75: "#91c649",
        0.9: "#6e9e28",
        1.0: "#3d5f14",
      },
    }).addTo(LOC.map);
  }

  LOC.bubbleLayer = L.layerGroup().addTo(LOC.map);
  bubbles.forEach(({ m, c, v, intensity }) => {
    const r = 5 + intensity * 16;
    const circle = L.circleMarker(c, {
      radius: r,
      color: m.de_uberlandia ? "#9a742f" : "#6e9e28",
      weight: m.de_uberlandia ? 2 : 1,
      fillColor: locCorEscala(intensity),
      fillOpacity: 0.55,
      opacity: 0.9,
    });
    circle.bindTooltip(
      `<strong>${esc(m.municipio)}/${esc(m.uf)}</strong><br>
       Resultados: <b>${fmtNum(m.quantidade)}</b><br>
       Valor: <b>${fmtMoeda(m.valor)}</b><br>
       Fornecedores: ${fmtNum(m.fornecedores)}`,
      { sticky: true, className: "loc-tooltip", opacity: 1 },
    );
    circle.on("click", () => {
      if (m.uf) locFocarUf(m.uf);
    });
    LOC.bubbleLayer.addLayer(circle);
  });

  locRenderLegend(max);
  locFitBounds();
}

function locRenderLegend(max) {
  const el = $("#loc-legend");
  if (!el) return;
  const label = locMetrica() === "valor" ? "Valor homologado" : "Quantidade de resultados";
  const stops = LOC_PALETTE.map(
    (c, i) => `<span class="loc-legend-swatch" style="background:${c}"></span>`,
  ).join("");
  el.innerHTML = `
    <div class="loc-legend-inner">
      <span class="loc-legend-label">${esc(label)}</span>
      <div class="loc-legend-ramp">${stops}</div>
      <div class="loc-legend-ends">
        <span>Baixo</span>
        <span>Máx. ${locFmtMetrica(max)}</span>
      </div>
    </div>`;
}

function locFitBounds() {
  if (!LOC.map) return;
  if (LOC.ufFocus && LOC.geoLayer) {
    const layers = [];
    LOC.geoLayer.eachLayer((ly) => {
      if (ly.feature?.properties?.sigla === LOC.ufFocus) layers.push(ly);
    });
    if (layers.length) {
      LOC.map.fitBounds(layers[0].getBounds(), { padding: [28, 28], maxZoom: 7 });
      return;
    }
  }
  if (LOC.geoLayer) {
    try {
      LOC.map.fitBounds(LOC.geoLayer.getBounds(), { padding: [16, 16] });
    } catch {
      LOC.map.setView([-14.2, -52.5], 4);
    }
  }
}

function locRedrawMap() {
  if (!LOC.map || !LOC.data) return;
  locClearLayers();
  if (LOC.mode === "calor") locPaintCalor();
  else locPaintEstados();
  const foot = $("#loc-map-footer");
  if (foot) {
    const modo = LOC.mode === "calor" ? "Calor por município" : "Coroplético por UF";
    const foco = LOC.ufFocus ? ` · foco ${LOC.ufFocus}` : "";
    foot.textContent = `${modo}${foco} · clique em um estado para detalhar`;
  }
}

function locFocarUf(sigla) {
  LOC.ufFocus = sigla;
  const sel = $("#loc-filtro-uf");
  if (sel && sel.value !== sigla) {
    // não altera o filtro de API — só o foco visual; ranking/tabela filtram localmente
  }
  const btn = $("#btn-loc-brasil");
  if (btn) btn.hidden = false;
  locRedrawMap();
  locRenderRanking();
  locRenderTabela();
  locRenderResumo();
}

function locLimparFoco() {
  LOC.ufFocus = null;
  const btn = $("#btn-loc-brasil");
  if (btn) btn.hidden = true;
  locRedrawMap();
  locRenderRanking();
  locRenderTabela();
  locRenderResumo();
}

/* -------------------- KPIs / ranking / tabela -------------------- */

function locRenderKpis() {
  const el = $("#loc-kpis");
  if (!el || !LOC.data) return;
  const r = LOC.data.resumo || {};
  const udi = r.uberlandia || {};
  const fora = r.fora || {};
  el.innerHTML = `
    <div class="loc-kpi loc-kpi-main">
      <span class="loc-kpi-n">${fmtNum(r.quantidade)}</span>
      <span class="loc-kpi-l">Resultados homologados</span>
    </div>
    <div class="loc-kpi">
      <span class="loc-kpi-n loc-kpi-money">${fmtMoeda(r.valor)}</span>
      <span class="loc-kpi-l">Valor homologado</span>
    </div>
    <div class="loc-kpi">
      <span class="loc-kpi-n">${fmtNum(r.ufs)}</span>
      <span class="loc-kpi-l">UFs com vencedores</span>
    </div>
    <div class="loc-kpi">
      <span class="loc-kpi-n">${fmtNum(r.municipios)}</span>
      <span class="loc-kpi-l">Municípios</span>
    </div>
    <div class="loc-kpi loc-kpi-udi">
      <span class="loc-kpi-n">${fmtNum(udi.pct_quantidade)}%</span>
      <span class="loc-kpi-l">Resultados em Uberlândia</span>
    </div>
    <div class="loc-kpi">
      <span class="loc-kpi-n">${fmtNum(fora.pct_quantidade)}%</span>
      <span class="loc-kpi-l">Resultados de fora</span>
    </div>`;
}

function locRenderUdiSplit() {
  const el = $("#loc-udi-split");
  if (!el || !LOC.data) return;
  const udi = LOC.data.resumo?.uberlandia || {};
  const fora = LOC.data.resumo?.fora || {};
  const metrica = locMetrica();
  const a = metrica === "valor" ? udi.valor : udi.quantidade;
  const b = metrica === "valor" ? fora.valor : fora.quantidade;
  const tot = (a || 0) + (b || 0) || 1;
  const pctA = Math.round((100 * (a || 0)) / tot);
  el.innerHTML = `
    <div class="loc-split-head">
      <span>Uberlândia × fora</span>
      <span class="muted-inline">${metrica === "valor" ? "por valor" : "por quantidade"}</span>
    </div>
    <div class="loc-split-bar" title="Uberlândia ${pctA}%">
      <div class="loc-split-udi" style="width:${pctA}%"></div>
      <div class="loc-split-fora" style="width:${100 - pctA}%"></div>
    </div>
    <div class="loc-split-meta">
      <span><i class="loc-dot udi"></i> Uberlândia ${locFmtMetrica(a)} (${fmtNum(udi.pct_quantidade)}% qtd · ${fmtNum(udi.pct_valor)}% valor)</span>
      <span><i class="loc-dot fora"></i> Fora ${locFmtMetrica(b)}</span>
    </div>`;
}

function locItensRanking() {
  if (!LOC.data) return [];
  if (LOC.ufFocus) {
    return (LOC.data.por_municipio || []).filter((m) => m.uf === LOC.ufFocus);
  }
  return LOC.data.por_uf || [];
}

function locRenderRanking() {
  const el = $("#loc-ranking");
  const titulo = $("#loc-rank-titulo");
  if (!el) return;
  const items = locItensRanking();
  if (titulo) {
    titulo.textContent = LOC.ufFocus
      ? `Municípios · ${LOC.ufFocus}`
      : "Ranking por UF";
  }
  if (!items.length) {
    el.innerHTML = '<p class="dash-empty">Sem dados para os filtros selecionados.</p>';
    return;
  }
  const max = Math.max(...items.map(locValorDe), 1);
  const slice = items.slice(0, 12);
  el.innerHTML = `<ul class="dash-bar-list loc-rank-list">
    ${slice
      .map((i) => {
        const v = locValorDe(i);
        const pct = Math.round(locNorm(v, max) * 100);
        const label = i.municipio ? `${i.municipio}` : `${i.uf} · ${i.nome || ""}`;
        const sub = i.municipio
          ? `${fmtNum(i.quantidade)} · ${fmtMoeda(i.valor)}`
          : `${fmtNum(i.quantidade)} · ${fmtMoeda(i.valor)}`;
        const cls = i.de_uberlandia ? " loc-rank-udi" : "";
        const click = i.municipio
          ? ""
          : ` data-uf="${esc(i.uf)}" role="button" tabindex="0"`;
        return `<li class="dash-bar-item loc-rank-item${cls}"${click}>
          <div class="dash-bar-meta">
            <span class="dash-bar-label" title="${esc(label)}">${esc(label)}</span>
            <span class="dash-bar-val">${locFmtMetrica(v)}</span>
          </div>
          <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct}%"></div></div>
          <div class="loc-rank-sub muted-inline">${esc(sub)}</div>
        </li>`;
      })
      .join("")}
    ${items.length > 12 ? `<li class="dash-bar-more muted-inline">+ ${items.length - 12} outros</li>` : ""}
  </ul>`;

  el.querySelectorAll("[data-uf]").forEach((node) => {
    const go = () => locFocarUf(node.dataset.uf);
    node.addEventListener("click", go);
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  });
}

function locMunicipiosVisiveis() {
  let rows = [...(LOC.municipios || [])];
  if (LOC.ufFocus) rows = rows.filter((m) => m.uf === LOC.ufFocus);
  return rows;
}

function locRenderTabela(sortKey, sortDir) {
  const tbody = $("#loc-table-body");
  const meta = $("#loc-table-meta");
  if (!tbody) return;
  let rows = locMunicipiosVisiveis();
  const thead = $("#loc-table-thead");
  const state = sortKey
    ? { key: sortKey, dir: sortDir || "asc" }
    : getTableSortState(thead) || { key: locMetrica(), dir: "desc" };

  rows = sortItems(rows, state.key, state.dir);
  markSortableHeaders(thead, state);

  if (meta) {
    const total = LOC.data?.por_municipio_total ?? rows.length;
    const foco = LOC.ufFocus ? ` · filtro visual ${LOC.ufFocus}` : "";
    meta.innerHTML = `${fmtNum(rows.length)} exibidos${total > rows.length ? ` de ${fmtNum(total)}` : ""}${foco}`;
  }

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="muted">Nenhum município para os filtros.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .slice(0, 200)
    .map((m) => {
      const origem = m.de_uberlandia
        ? '<span class="pill-local-udi">Uberlândia</span>'
        : '<span class="pill-local-fora">Fora</span>';
      return `<tr>
        ${tdEllipsis(m.municipio)}
        <td>${esc(m.uf)}</td>
        <td class="col-num">${fmtNum(m.quantidade)}</td>
        <td class="col-num col-money">${fmtMoeda(m.valor)}</td>
        <td class="col-num">${fmtNum(m.contratacoes)}</td>
        <td class="col-num">${fmtNum(m.fornecedores)}</td>
        <td>${origem}</td>
      </tr>`;
    })
    .join("");
}

function locRenderResumo() {
  const el = $("#loc-filtros-resumo");
  if (!el || !LOC.data) return;
  const f = LOC.data.filtros || {};
  const parts = [f.ano ? `Ano <strong>${f.ano}</strong>` : "Ano <strong>todos</strong>"];
  if (f.orgao_nome) parts.push(`Órgão <strong>${esc(f.orgao_nome)}</strong>`);
  if (f.modalidade_nome) parts.push(`Modalidade <strong>${esc(f.modalidade_nome)}</strong>`);
  if (f.uf) parts.push(`UF <strong>${esc(f.uf)}</strong>`);
  if (f.escopo && f.escopo !== "todos") {
    parts.push(f.escopo === "uberlandia" ? "Escopo <strong>Uberlândia</strong>" : "Escopo <strong>fora</strong>");
  }
  parts.push(f.metrica === "valor" ? "Mapa por <strong>valor</strong>" : "Mapa por <strong>quantidade</strong>");
  if (LOC.ufFocus) parts.push(`Foco <strong>${esc(LOC.ufFocus)}</strong>`);
  el.innerHTML = parts.join(" · ");
}

/* -------------------- carga / filtros -------------------- */

async function carregarLocFiltros() {
  try {
    const data = await api("/api/distribuicao-localidade/filtros");
    const selAno = $("#loc-filtro-ano");
    const selOrg = $("#loc-filtro-orgao");
    const selUf = $("#loc-filtro-uf");
    if (selAno) {
      selAno.innerHTML =
        '<option value="">Todos</option>' +
        (data.anos || []).map((a) => `<option value="${a}">${a}</option>`).join("");
    }
    if (selOrg) {
      selOrg.innerHTML =
        '<option value="">Todos</option>' +
        (data.orgaos || [])
          .map((o) => `<option value="${o.id}">${esc(o.sigla ? `${o.sigla} · ${o.nome}` : o.nome)}</option>`)
          .join("");
    }
    multiSelectOf("#loc-filtro-modalidade")?.setOptions(
      (data.modalidades || []).map((m) => ({ value: m.id, label: m.nome })),
    );
    if (selUf) {
      selUf.innerHTML =
        '<option value="">Todas</option>' +
        (data.ufs || []).map((u) => `<option value="${u.sigla}">${esc(u.sigla)} · ${esc(u.nome)}</option>`).join("");
    }
  } catch (err) {
    console.error("Filtros localidade:", err);
  }
}

async function carregarLocStats() {
  const params = new URLSearchParams();
  const ano = $("#loc-filtro-ano")?.value;
  const orgao = $("#loc-filtro-orgao")?.value;
  const uf = $("#loc-filtro-uf")?.value;
  const escopo = $("#loc-filtro-escopo")?.value || "todos";
  const metrica = $("#loc-filtro-metrica")?.value || "quantidade";
  if (ano) params.set("ano", ano);
  if (orgao) params.set("orgao_id", orgao);
  appendQueryAll(params, "modalidade_id", multiSelectOf("#loc-filtro-modalidade")?.getValues());
  if (uf) params.set("uf", uf);
  if (escopo) params.set("escopo", escopo);
  params.set("metrica", metrica);

  const btn = $("#btn-loc-atualizar");
  if (btn) btn.disabled = true;
  try {
    const data = await api(`/api/distribuicao-localidade/stats?${params}`);
    LOC.data = data;
    LOC.municipios = data.por_municipio || [];
    // se filtro UF da API mudou, alinhar foco
    if (uf) LOC.ufFocus = uf;
    else if (LOC.ufFocus && !(data.por_uf || []).some((u) => u.uf === LOC.ufFocus)) {
      LOC.ufFocus = null;
    }
    const btnBr = $("#btn-loc-brasil");
    if (btnBr) btnBr.hidden = !LOC.ufFocus;

    locRenderKpis();
    locRenderUdiSplit();
    locRenderResumo();
    locRedrawMap();
    locRenderRanking();
    clearTableSortState($("#loc-table-thead"));
    locRenderTabela(locMetrica(), "desc");
  } catch (err) {
    const rank = $("#loc-ranking");
    if (rank) rank.innerHTML = `<p class="result err">${esc(err.message)}</p>`;
    const kpis = $("#loc-kpis");
    if (kpis) kpis.innerHTML = "";
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function carregarLocalidade() {
  await locEnsureAssets();
  locInitMap();
  if (!LOC.ready) {
    LOC.ready = true;
    setTimeout(() => LOC.map?.invalidateSize(), 120);
  } else {
    setTimeout(() => LOC.map?.invalidateSize(), 60);
  }
  await carregarLocFiltros();
  await carregarLocStats();
}

/* -------------------- eventos -------------------- */

$("#form-loc-filtros")?.addEventListener("submit", (e) => {
  e.preventDefault();
  carregarLocStats();
});

$("#btn-loc-limpar")?.addEventListener("click", () => {
  $("#form-loc-filtros")?.reset();
  LOC.ufFocus = null;
  carregarLocStats();
});

$("#btn-loc-brasil")?.addEventListener("click", () => {
  const sel = $("#loc-filtro-uf");
  if (sel) sel.value = "";
  locLimparFoco();
  // se havia filtro de UF na API, recarrega sem ele
  if ($("#loc-filtro-uf")?.value === "") carregarLocStats();
});

$$(".loc-mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".loc-mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    LOC.mode = btn.dataset.mode || "estados";
    locRedrawMap();
  });
});

$("#loc-filtro-metrica")?.addEventListener("change", () => {
  if (LOC.data) {
    locRenderUdiSplit();
    locRenderResumo();
    locRedrawMap();
    locRenderRanking();
    locRenderTabela(locMetrica(), "desc");
  }
});

wireSortableHeaders($("#loc-table-thead"), (key, dir) => locRenderTabela(key, dir));

registrarPagina("localidade", carregarLocalidade);
