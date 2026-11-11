import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  OpFiltroVolumes,
  VOLUME_FILTRO_VAZIO,
  filtrarVolumesEscolha,
  volumeFiltroAtivo,
  type VolumeFiltroEstado,
} from './OpFiltroVolumes';
import {
  ApiError,
  api,
  type OpRetiradaVolume,
  type OrdemProducao,
  type OrdemProducaoMaterial,
} from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import type { EstoqueQrVolumeInfo } from '../lib/estoqueQrFila';
import {
  faltaCoberturaVolumes,
  formatLotePick,
  formatMetrosLineares,
  leituraNecessidadeOp,
  formatPickPrincipal,
  formatQtdePick,
  formatVolumeDimensao,
  formatVolumesComArea,
  areaM2Volume,
  larguraMmParaMetro,
  modoRetirada,
  qtdeContadaDigitada,
  qtdeContadaExibida,
  qtdeContadaInteira,
  qtdeLinhaPick,
  qtdeVolumeTotal,
  unidadeContada,
  somaAreaM2Volumes,
  localOverlayEscolha,
  volumeSugerido,
  volumesParaEscolha,
} from '../lib/producaoPick';
import {
  opComponenteLabel,
  opKitEstado,
  opKitNome,
  parseQtdeDigitada,
} from '../lib/producaoUi';
import { PartidaDivisaoQuadro } from './PartidaDivisaoQuadro';
import { rotuloLocal, type LocalSaldo } from './LocalSaldoCampo';
import { bobinasRetornoPendentes, rotuloBobinaRetorno } from '../lib/partidaUi';

type Props = {
  op: OrdemProducao;
  material: OrdemProducaoMaterial;
  porta: 'op' | 'chao';
  canWrite: boolean;
  onClose: () => void;
  onOp: (data: OrdemProducao) => void;
};

function qtdeCanon(n: number): string {
  return n.toFixed(4);
}

/**
 * Exceção: outro volume (com motivo) ou devolver (bom).
 * Happy path FEFO fica no kit (botão Saiu / Confirmar saída sugerida).
 * Perda do volume saído = OP (emenda 2026-10-30c) — não neste overlay.
 */
export function OpEscolhaOverlay({
  op,
  material,
  porta,
  canWrite,
  onClose,
  onOp,
}: Props) {
  const modo = modoRetirada(material);
  const estado = opKitEstado(material);
  const noEstoque = porta === 'chao';
  /** Baixa só na porta do estoque (ADR três portas). */
  const podeBaixar =
    noEstoque && canWrite && estado !== 'ja_saiu' && (estado === 'falta_pegar' || modo === 'volume');
  /**
   * Devolver: mesmo MOV ENTRADA_SOBRA. Quem tem estoque.escrever pode na OP ou no chão.
   */
  const podeDevolver = canWrite && estado === 'ja_saiu';
  /** Sempre o pool API (já exclui perda). Vazio = nada a devolver — nunca cair em baixados. */
  const volsADevolver = useMemo(
    () => material.retirada?.volumes_a_devolver ?? [],
    [material],
  );
  const volsLinha = useMemo(() => volumesParaEscolha(material), [material]);
  const [catalogo, setCatalogo] = useState<OpRetiradaVolume[] | null>(null);
  const [catalogoCarregando, setCatalogoCarregando] = useState(false);
  const vols = catalogo ?? volsLinha;
  const larguraFallback = larguraMmParaMetro(material, op);
  const alvo = parseQtdeDigitada(material.qtde_planejada ?? material.retirada?.qtde ?? '0');
  /** Área que a ordem pede (m²) — unidade do writer; comparável com o carrinho. */
  const precisaM2 = modo === 'volume' ? qtdeLinhaPick(material) : null;
  const fefoIds = useMemo(
    () =>
      (material.retirada?.volumes ?? [])
        .map((v) => v.lote_id)
        .filter((id): id is number => typeof id === 'number' && id > 0)
        .sort((a, b) => a - b),
    [material],
  );

  const [marcados, setMarcados] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const v of vols) {
      if (!v.lote_id) continue;
      init[v.lote_id] = false;
    }
    return init;
  });
  const isRetornoPrevisto = (v: OpRetiradaVolume) =>
    v.faixa === 'partida' || v.faixa === 'sobra';
  const [devolverMarcados, setDevolverMarcados] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const v of volsADevolver) {
      if (v.lote_id) {
        // Passa / partida: pré-marca para o operador só confirmar + motivo.
        init[v.lote_id] = isRetornoPrevisto(v);
      }
    }
    return init;
  });
  const [posPartida, setPosPartida] = useState<{
    loteIds: number[];
    resumo: string[];
  } | null>(null);
  const [motivoDevolver, setMotivoDevolver] = useState(() =>
    (material.retirada?.volumes_a_devolver ?? []).some(isRetornoPrevisto)
      ? 'Passa — devolver sobra ao estoque'
      : '',
  );
  const bobinasVolta = useMemo(() => bobinasRetornoPendentes(material), [material]);
  const [locaisBobina, setLocaisBobina] = useState<Record<string, string>>({});
  const [enderecos, setEnderecos] = useState<LocalSaldo[]>([]);
  const [filtro, setFiltro] = useState<VolumeFiltroEstado>(VOLUME_FILTRO_VAZIO);
  const [qr, setQr] = useState('');
  const peca = unidadeContada(material.unidade);
  const saiu = parseQtdeDigitada(material.qtde_requisitada);
  const devolverInteiro = peca && qtdeContadaInteira(saiu);
  const [qtdeUn, setQtdeUn] = useState(() =>
    peca ? qtdeContadaExibida(material.qtde_planejada ?? alvo) : (material.qtde_planejada ?? String(alvo || '')),
  );
  const [qtdeDevolver, setQtdeDevolver] = useState(() =>
    devolverInteiro ? qtdeContadaExibida(saiu) : String(saiu || ''),
  );
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const qrRef = useRef<HTMLInputElement>(null);
  const volsVisiveis = useMemo(() => filtrarVolumesEscolha(vols, filtro), [vols, filtro]);

  useEffect(() => {
    if (modo !== 'volume' || estado === 'ja_saiu') return;
    let cancel = false;
    setCatalogo(null);
    setCatalogoCarregando(true);
    api
      .get<{ data: OpRetiradaVolume[] }>(
        `/ordens-producao/${op.id}/volumes-escolha?material_id=${material.id}`,
      )
      .then((res) => {
        if (cancel) return;
        const lista = res.data ?? [];
        setCatalogo(lista);
        setMarcados((prev) => {
          const next = { ...prev };
          for (const v of lista) {
            if (!v.lote_id || next[v.lote_id] !== undefined) continue;
            next[v.lote_id] = false;
          }
          return next;
        });
      })
      .catch(() => {
        if (!cancel) setCatalogo(null);
      })
      .finally(() => {
        if (!cancel) setCatalogoCarregando(false);
      });
    return () => {
      cancel = true;
    };
  }, [modo, estado, op.id, material.id]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (qr.trim()) {
        setQr('');
        return;
      }
      if (volumeFiltroAtivo(filtro)) {
        setFiltro(VOLUME_FILTRO_VAZIO);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [filtro, qr, onClose]);

  useEffect(() => {
    if (!podeBaixar || modo !== 'volume') return;
    const t = window.setTimeout(() => qrRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [podeBaixar, modo, material.id]);

  useEffect(() => {
    if (!podeDevolver || bobinasVolta.length === 0) return;
    let vivo = true;
    void api
      .get<{ data: LocalSaldo[] }>('/estoque/enderecos')
      .then((res) => {
        if (vivo) setEnderecos(res.data ?? []);
      })
      .catch(() => {
        if (vivo) setEnderecos([]);
      });
    return () => {
      vivo = false;
    };
  }, [podeDevolver, bobinasVolta.length]);

  const escolhidos = vols.filter((v) => v.lote_id && marcados[v.lote_id]);
  const mesmoSku =
    escolhidos.length === 0 ||
    escolhidos.every((v) => !v.produto_id || v.produto_id === material.produto?.id);
  const localCabe = localOverlayEscolha(material, escolhidos);
  const somaVol = escolhidos.reduce((acc, v) => acc + qtdeVolumeTotal(v), 0);
  const areaCarrinho = somaAreaM2Volumes(escolhidos);
  const faltaM2 =
    precisaM2 != null && areaCarrinho != null
      ? Math.max(0, precisaM2 - areaCarrinho)
      : null;
  const cobreNecessidade =
    precisaM2 != null && areaCarrinho != null ? areaCarrinho + 1e-6 >= precisaM2 : null;
  const temPartidaEscolhida = escolhidos.some(
    (v) => v.faixa === 'partida' || v.faixa === 'sobra',
  );
  const override =
    modo === 'volume' &&
    mesmoSku &&
    !temPartidaEscolhida &&
    (() => {
      const ids = escolhidos
        .map((v) => v.lote_id)
        .filter((id): id is number => typeof id === 'number')
        .sort((a, b) => a - b);
      return ids.length !== fefoIds.length || ids.some((id, i) => id !== fefoIds[i]);
    })();

  const marcarVolume = (loteId: number, on: boolean) => {
    setMarcados((prev) => ({ ...prev, [loteId]: on }));
    setErr(null);
  };

  const lerVolume = async (payload: string) => {
    const p = payload.trim();
    if (!p || !podeBaixar || modo !== 'volume') return;
    if (p.toUpperCase().startsWith('END:')) {
      setErr('Esse QR é de local (END:…). O local de cada bobina já aparece na tabela.');
      setMsg(null);
      qrRef.current?.select();
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.get<{ data: EstoqueQrVolumeInfo }>(
        `/estoque/retiradas/${op.id}/volume?payload=${encodeURIComponent(p)}`,
      );
      const vol = res.data;
      let naLista = vols.find((v) => v.lote_id === vol.lote_id);
      if (!naLista?.lote_id) {
        naLista = {
          lote_id: vol.lote_id,
          codigo: vol.codigo,
          nf_numero: vol.nf_numero,
          qtde_volume: vol.qtde,
          qtde_retirar: '0',
          unidade: vol.unidade,
          data_entrada: vol.data_entrada,
          data_validade: null,
          status: null,
          status_label: null,
          largura_mm: null,
          comprimento_m: null,
          endereco: vol.endereco,
          sugerido: false,
          motivo: 'ESTOQUE',
          ordem_politica: null,
          sku: vol.produto?.codigo ?? null,
          produto_id: vol.produto?.id ?? null,
          descricao: vol.produto?.descricao_fiscal ?? null,
        };
        setCatalogo((prev) => [...(prev ?? volsLinha), naLista as OpRetiradaVolume]);
      }
      const loteId = naLista.lote_id;
      if (loteId == null) return;
      if (marcados[loteId]) {
        setMsg(`Volume ${vol.codigo} já está no carrinho.`);
        setQr('');
        window.setTimeout(() => qrRef.current?.focus(), 40);
        return;
      }
      marcarVolume(loteId, true);
      const area = areaM2Volume(naLista);
      const metros = formatMetrosLineares(naLista, larguraFallback);
      const detalhe =
        area != null && metros
          ? `${formatQtdePick(area, 'm²')} · rolo ${metros}`
          : area != null
            ? formatQtdePick(area, 'm²')
            : metros;
      setMsg(
        detalhe
          ? `Volume ${vol.codigo} no carrinho · bobina inteira (${detalhe}).`
          : `Volume ${vol.codigo} no carrinho · bobina inteira.`,
      );
      setQr('');
      window.setTimeout(() => qrRef.current?.focus(), 40);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Volume não reconhecido.');
      qrRef.current?.select();
    } finally {
      setBusy(false);
    }
  };

  const onQrKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    void lerVolume(qr);
  };

  const confirmar = async () => {
    if (!podeBaixar) return;
    if (modo === 'volume') {
      if (escolhidos.length === 0) {
        setErr('Marque ou escaneie as bobinas que vai levar.');
        return;
      }
      if (override && motivo.trim().length < 3) {
        setErr('Informe o motivo (mínimo 3 caracteres) para outro volume.');
        return;
      }
      if (
        faltaCoberturaVolumes(
          material,
          op,
          escolhidos.map((v) => ({ vol: v, qtde: qtdeVolumeTotal(v) })),
        )
      ) {
        setErr('Os volumes escolhidos não cobrem a metragem da ordem. Pode sobrar bobina; não pode faltar.');
        return;
      }
    } else if (parseQtdeDigitada(qtdeUn) <= 0) {
      setErr('Informe as unidades.');
      return;
    } else if (peca && !qtdeContadaInteira(parseQtdeDigitada(qtdeUn))) {
      setErr('A quantidade tem de ser inteira.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const linha =
        modo === 'volume'
          ? {
              material_id: material.id,
              qtde: qtdeCanon(somaVol),
              volumes: escolhidos.map((v) => ({
                lote_id: v.lote_id as number,
                qtde: qtdeCanon(qtdeVolumeTotal(v)),
              })),
              volumes_motivo: override ? motivo.trim() : undefined,
            }
          : { material_id: material.id, qtde: qtdeCanon(parseQtdeDigitada(qtdeUn)) };
      const res = await api.post<{ data: OrdemProducao }>(`/estoque/retiradas/${op.id}/confirmar`, {
        linhas: [linha],
      });
      onOp(res.data);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao confirmar.');
    } finally {
      setBusy(false);
    }
  };

  const volsDevolverEscolhidos = volsADevolver.filter(
    (v) => v.lote_id && devolverMarcados[v.lote_id],
  );

  const confirmarDevolver = async () => {
    if (!podeDevolver) return;
    if (motivoDevolver.trim().length < 3) {
      setErr('Informe o motivo da devolução (mínimo 3 caracteres).');
      return;
    }
    const usaBobinas = bobinasVolta.length > 0;
    if (usaBobinas) {
      const locaisOk = bobinasVolta.every((b) => Number(locaisBobina[b.chave] ?? 0) > 0);
      if (!locaisOk) {
        setErr('Informe o local de cada bobina (refile e sobra são volumes separados).');
        return;
      }
    } else if (modo === 'volume') {
      if (volsDevolverEscolhidos.length === 0) {
        setErr('Marque o volume que volta à prateleira.');
        return;
      }
    } else if (parseQtdeDigitada(qtdeDevolver) <= 0) {
      setErr('Informe a quantidade a devolver.');
      return;
    } else if (devolverInteiro && !qtdeContadaInteira(parseQtdeDigitada(qtdeDevolver))) {
      setErr('A quantidade tem de ser inteira.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      let payload: Record<string, unknown>;
      if (usaBobinas) {
        const porPai = new Map<number, number>();
        for (const b of bobinasVolta) {
          porPai.set(
            b.lote_pai_id,
            (porPai.get(b.lote_pai_id) ?? 0) + parseQtdeDigitada(b.qtde),
          );
        }
        payload = {
          material_id: material.id,
          motivo: motivoDevolver.trim(),
          volumes: [...porPai.entries()].map(([lote_id, qtde]) => ({
            lote_id,
            qtde: qtdeCanon(qtde),
          })),
          locais: bobinasVolta.map((b) => ({
            lote_pai_id: b.lote_pai_id,
            tipo: b.tipo,
            endereco_id: Number(locaisBobina[b.chave]),
          })),
        };
      } else if (modo === 'volume') {
        payload = {
          material_id: material.id,
          motivo: motivoDevolver.trim(),
          volumes: volsDevolverEscolhidos.map((v) => ({
            lote_id: v.lote_id as number,
            qtde: qtdeCanon(parseQtdeDigitada(v.qtde_retirar) || qtdeVolumeTotal(v)),
          })),
        };
      } else {
        payload = {
          material_id: material.id,
          motivo: motivoDevolver.trim(),
          qtde: qtdeCanon(parseQtdeDigitada(qtdeDevolver)),
        };
      }
      const res = await api.post<{ data: OrdemProducao }>(
        `/estoque/retiradas/${op.id}/devolver`,
        payload,
      );
      onOp(res.data);
      const matPos = (res.data.materiais ?? []).find((x) => x.id === material.id);
      const gerados = (matPos?.partida_prevista ?? [])
        .filter((p) => p.status === 'devolvido')
        .flatMap((p) => p.volumes_gerados ?? []);
      const loteIds = gerados
        .map((g) => Number(g.lote_id))
        .filter((id) => Number.isFinite(id) && id > 0);
      if (loteIds.length > 0) {
        setPosPartida({
          loteIds,
          resumo: gerados.map((g) => {
            const tipo = g.tipo === 'refile' ? 'Refile' : 'Sobra';
            const L = g.largura_mm
              ? `${formatDecimalBr(g.largura_mm, 1, { stripTrailingZeros: true })} mm`
              : '';
            const C = g.comprimento_m
              ? `${formatDecimalBr(g.comprimento_m, 1, { stripTrailingZeros: true })} m`
              : '';
            return [tipo, L, C].filter(Boolean).join(' · ');
          }),
        });
        setMsg('Sobras de partida geradas. Imprima as etiquetas e guarde no local.');
        return;
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao devolver.');
    } finally {
      setBusy(false);
    }
  };

  const tipo = opComponenteLabel(material.componente);
  const leitura = leituraNecessidadeOp(material, op);

  return (
    <div className="op-escolha" role="dialog" aria-modal="true" aria-labelledby="op-escolha-title">
      <button type="button" className="op-escolha__backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="op-escolha__panel">
        <header className="op-escolha__head">
          <div className="op-escolha__head-main">
            <p className="op-escolha__tipo">{tipo}</p>
            <h2 id="op-escolha-title">{opKitNome(material)}</h2>
            {localCabe ? (
              <p className="op-escolha__bin">
                <span className="op-escolha__bin-rotulo">{localCabe.rotulo}</span>
                <span>{localCabe.locais.join(' · ')}</span>
              </p>
            ) : null}
            <p className="muted op-escolha__hint">
              {posPartida
                ? 'Partida concluída no sistema. Imprima as etiquetas das bobinas novas e guarde no local.'
                : estado === 'ja_saiu'
                  ? podeDevolver
                    ? 'Marque o que volta à prateleira (ainda bom, antes de concluir a OP). Perda do volume fica na ordem. Partida gera refile/sobra como volumes novos.'
                    : 'Já saiu. Peça a quem tem estoque para devolver à prateleira.'
                  : modo === 'volume'
                    ? 'Outro volume — marque o que vai levar e informe o motivo (FEFO fica no botão Saiu da lista). Bobina mais larga = partida (sem motivo FEFO).'
                    : 'Ajuste a quantidade se diferir do pedido (o botão Saiu da lista usa a qtde sugerida).'}
            </p>
          </div>
          <div className="op-escolha__head-side">
            <div className="op-escolha__precisa">
              <span>A ordem pede</span>
              <strong>{leitura.principal}</strong>
              {leitura.complemento ? <span className="op-qtde-extra">{leitura.complemento}</span> : null}
            </div>
            {estado === 'ja_saiu' ? (
              <div className="op-escolha__precisa op-escolha__precisa--saiu">
                <span>Saiu da prateleira</span>
                <strong>{formatPickPrincipal(material, op)}</strong>
              </div>
            ) : null}
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Fechar
            </button>
          </div>
        </header>

        {modo === 'volume' && podeBaixar ? (
          <div
            className={`op-escolha__progresso${cobreNecessidade ? ' is-ok' : ''}`}
            aria-live="polite"
          >
            <div className="op-escolha__progresso-item">
              <span>No carrinho (área)</span>
              <strong>
                {escolhidos.length === 0
                  ? '—'
                  : formatVolumesComArea(escolhidos.length, areaCarrinho)}
              </strong>
            </div>
            <div className="op-escolha__progresso-item">
              <span>{cobreNecessidade ? 'Situação' : 'Falta (área)'}</span>
              <strong>
                {escolhidos.length === 0
                  ? 'Vazio'
                  : cobreNecessidade
                    ? 'Área coberta'
                    : faltaM2 != null
                      ? formatQtdePick(faltaM2, 'm²')
                      : 'Conferir físico'}
              </strong>
            </div>
          </div>
        ) : null}

        {err ? <div className="alert alert-danger">{err}</div> : null}
        {msg ? <div className="alert alert-success">{msg}</div> : null}

        <div className="op-escolha__body">
          {posPartida ? (
            <div className="orc-faixas-bloco" style={{ marginTop: 0 }}>
              <p className="form-hint" style={{ marginTop: 0 }}>
                Volumes gerados (mesmo SKU):
              </p>
              <ul style={{ margin: '0.35rem 0 0.75rem', paddingLeft: '1.2rem' }}>
                {posPartida.resumo.map((linha, idx) => (
                  <li key={`${posPartida.loteIds[idx]}-${idx}`}>{linha}</li>
                ))}
              </ul>
              <div className="btn-row" style={{ margin: 0, gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link
                  className="btn btn-primary btn-sm"
                  to={`/estoque/lotes/etiquetas?${posPartida.loteIds
                    .map((id) => `ids=${id}`)
                    .join('&')}`}
                  onClick={onClose}
                >
                  Imprimir etiquetas
                </Link>
                <Link className="btn btn-secondary btn-sm" to="/estoque/guardar" onClick={onClose}>
                  Guardar no local
                </Link>
                <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                  Fechar
                </button>
              </div>
            </div>
          ) : estado === 'ja_saiu' ? (
            podeDevolver ? (
              modo === 'volume' ? (
                <>
                  <p className="muted" style={{ marginTop: 0 }}>
                    {bobinasVolta.length > 1
                      ? `${bobinasVolta.length} bobinas a devolver (refile e sobra são volumes separados — local em cada uma).`
                      : 'Volumes ainda fora da prateleira nesta OP — só o que ainda serve.'}
                  </p>
                  {bobinasVolta.length > 0 ? (
                    <div className="table-wrap op-escolha__table-wrap">
                      {(material.partida_prevista ?? [])
                        .filter((p) => p.status === 'pendente' && p.L_n)
                        .map((p) => (
                          <PartidaDivisaoQuadro
                            key={`dev-div-${p.lote_pai_id}`}
                            preview={{
                              tipo: p.tipo,
                              L_p: String(p.L_p ?? ''),
                              C_p: String(p.C_p ?? ''),
                              L_n: String(p.L_n ?? ''),
                              C_u: String(p.C_u_previsto ?? ''),
                              area_consumida: p.area_consumida,
                              area_retorno: p.area_retorno,
                              refile: p.refile,
                              sobra: p.sobra,
                            }}
                            titulo="Divisão — o que volta são as linhas abaixo"
                          />
                        ))}
                      <table className="data-table op-escolha__table">
                        <thead>
                          <tr>
                            <th>Bobina</th>
                            <th>Medida</th>
                            <th>m²</th>
                            <th>Local</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bobinasVolta.map((b) => (
                            <tr key={b.chave}>
                              <td>
                                <strong>{rotuloBobinaRetorno(b.tipo)}</strong>
                              </td>
                              <td>
                                {[
                                  b.largura_mm
                                    ? `${formatDecimalBr(b.largura_mm, 1, { stripTrailingZeros: true })} mm`
                                    : '',
                                  b.comprimento_m
                                    ? `${formatDecimalBr(b.comprimento_m, 1, { stripTrailingZeros: true })} m`
                                    : '',
                                ]
                                  .filter(Boolean)
                                  .join(' × ') || '—'}
                              </td>
                              <td>
                                {formatQtdePick(
                                  parseQtdeDigitada(b.area_m2 || b.qtde),
                                  'm²',
                                )}
                              </td>
                              <td>
                                <select
                                  aria-label={`Local — ${rotuloBobinaRetorno(b.tipo)}`}
                                  disabled={busy}
                                  value={locaisBobina[b.chave] ?? ''}
                                  onChange={(e) =>
                                    setLocaisBobina((prev) => ({
                                      ...prev,
                                      [b.chave]: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Escolher local</option>
                                  {enderecos.map((l) => (
                                    <option key={l.id} value={String(l.id)}>
                                      {rotuloLocal(l) || l.codigo}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                  <div className="table-wrap op-escolha__table-wrap">
                    <table className="data-table op-escolha__table">
                      <thead>
                        <tr>
                          <th className="op-escolha__col-check">Devolver</th>
                          <th>Volume</th>
                          <th>Qtde</th>
                          <th>Local</th>
                        </tr>
                      </thead>
                      <tbody>
                        {volsADevolver.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="muted">
                              Nada a devolver neste SKU.
                            </td>
                          </tr>
                        ) : (
                          volsADevolver.map((v) => {
                            const id = v.lote_id as number;
                            const on = Boolean(devolverMarcados[id]);
                            return (
                              <tr key={id} className={on ? 'is-on' : ''}>
                                <td className="op-escolha__col-check">
                                  <input
                                    type="checkbox"
                                    checked={on}
                                    disabled={busy}
                                    aria-label={`Devolver ${formatLotePick(v)}`}
                                    onChange={() =>
                                      setDevolverMarcados((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      }))
                                    }
                                  />
                                </td>
                                <td>
                                  <strong>{formatLotePick(v)}</strong>
                                  {formatVolumeDimensao(v) ? (
                                    <div className="muted" style={{ fontSize: '0.85em' }}>
                                      {formatVolumeDimensao(v)}
                                    </div>
                                  ) : null}
                                </td>
                                <td>
                                  {formatQtdePick(
                                    parseQtdeDigitada(v.qtde_retirar),
                                    v.unidade ?? material.unidade,
                                  )}
                                </td>
                                <td>{v.endereco?.codigo ?? '—'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  )}
                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label htmlFor="op-escolha-motivo-dev">Motivo da devolução</label>
                    <input
                      id="op-escolha-motivo-dev"
                      value={motivoDevolver}
                      onChange={(e) => setMotivoDevolver(e.target.value)}
                      disabled={busy}
                      placeholder="Ex.: sobrou na mesa / partida — guardar refile"
                    />
                  </div>
                </>
              ) : (
                <div className="op-escolha__un">
                  <label htmlFor="op-escolha-dev-un">Quantidade a devolver</label>
                  <input
                    id="op-escolha-dev-un"
                    className="op-escolha__un-input"
                    inputMode={devolverInteiro ? 'numeric' : 'decimal'}
                    value={qtdeDevolver}
                    disabled={busy}
                    onChange={(e) =>
                      setQtdeDevolver(devolverInteiro ? qtdeContadaDigitada(e.target.value) : e.target.value)
                    }
                  />
                  <p className="muted">
                    Já saiu{' '}
                    {formatQtdePick(
                      parseQtdeDigitada(material.qtde_requisitada),
                      material.unidade,
                    )}
                    .
                  </p>
                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label htmlFor="op-escolha-motivo-dev-un">Motivo da devolução</label>
                    <input
                      id="op-escolha-motivo-dev-un"
                      value={motivoDevolver}
                      onChange={(e) => setMotivoDevolver(e.target.value)}
                      disabled={busy}
                      placeholder="Ex.: sobrou / não vai usar"
                    />
                  </div>
                </div>
              )
            ) : (
              <p className="muted">
                Este item já saiu do estoque. Quem devolve precisa de permissão de estoque.
              </p>
            )
          ) : modo === 'volume' ? (
            <>
              {estado === 'sem_estoque' ? (
                <p className="muted" style={{ marginTop: 0 }}>
                  Sem saldo neste SKU. Volumes parecidos aparecem primeiro na lista.
                </p>
              ) : null}
              {podeBaixar ? (
                <div className="form-group op-escolha__qr">
                  <label htmlFor="op-escolha-qr">Ler volume (VOL:…)</label>
                  <input
                    id="op-escolha-qr"
                    ref={qrRef}
                    value={qr}
                    disabled={busy}
                    onChange={(e) => setQr(e.target.value)}
                    onKeyDown={onQrKey}
                    placeholder="Pistola ou digite — Enter marca o volume"
                    autoComplete="off"
                  />
                </div>
              ) : null}

              <OpFiltroVolumes
                idPrefix="op-escolha"
                value={filtro}
                onChange={setFiltro}
                total={vols.length}
                visiveis={volsVisiveis.length}
                autoFocus={false}
              />

              <div className="table-wrap op-escolha__table-wrap">
                <table className="data-table op-escolha__table">
                  <thead>
                    <tr>
                      {podeBaixar ? <th className="op-escolha__col-check">Levar</th> : null}
                      <th>Volume</th>
                      <th>Área</th>
                      <th>Rolo</th>
                      <th>Local</th>
                      <th>FEFO</th>
                      <th>NF</th>
                      <th>Validade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogoCarregando && catalogo == null ? (
                      <tr>
                        <td colSpan={podeBaixar ? 8 : 7} className="muted">
                          Carregando o estoque…
                        </td>
                      </tr>
                    ) : vols.length === 0 ? (
                      <tr>
                        <td colSpan={podeBaixar ? 8 : 7} className="muted">
                          Nenhum volume com saldo nesta empresa.
                        </td>
                      </tr>
                    ) : volsVisiveis.length === 0 ? (
                      <tr>
                        <td colSpan={podeBaixar ? 8 : 7} className="muted">
                          Nenhum volume com esse filtro.
                        </td>
                      </tr>
                    ) : (
                      volsVisiveis.map((v) => {
                        const id = v.lote_id as number;
                        const on = Boolean(marcados[id]);
                        const metros = formatMetrosLineares(v, larguraFallback);
                        const area = areaM2Volume(v);
                        const dim = formatVolumeDimensao(v);
                        const sugerido = volumeSugerido(v);
                        return (
                          <tr
                            key={id}
                            className={[
                              on ? 'is-on' : '',
                              sugerido ? 'is-fefo' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {podeBaixar ? (
                              <td className="op-escolha__col-check">
                                <input
                                  type="checkbox"
                                  checked={on}
                                  disabled={busy}
                                  aria-label={`Levar ${formatLotePick(v)}`}
                                  onChange={() => marcarVolume(id, !on)}
                                />
                              </td>
                            ) : null}
                            <td>
                              <strong>{formatLotePick(v)}</strong>
                              {v.descricao ? <div>{v.descricao}</div> : null}
                              {v.sku ? <div className="muted">{v.sku}</div> : null}
                              {v.faixa === 'partida' ? (
                                <div className="muted" style={{ fontSize: '0.85em' }}>
                                  Partida (largura maior)
                                </div>
                              ) : null}
                            </td>
                            <td>{area != null ? formatQtdePick(area, 'm²') : '—'}</td>
                            <td>
                              {dim ?? '—'}
                              {metros && dim ? (
                                <div className="muted" style={{ fontSize: '0.85em' }}>
                                  {metros} de rolo
                                </div>
                              ) : null}
                              {v.faixa === 'partida' || v.faixa === 'sobra' ? (
                                <div className="muted" style={{ fontSize: '0.85em' }}>
                                  {v.faixa === 'partida' ? 'Partida (largura maior)' : 'Passa (mesma medida)'}
                                </div>
                              ) : null}
                            </td>
                            <td>{v.endereco?.codigo ?? '—'}</td>
                            <td>
                              {sugerido
                                ? 'Sugerido'
                                : v.produto_id &&
                                    v.produto_id !== material.produto?.id &&
                                    (v.proximidade ?? 0) > 0
                                  ? 'Parecido'
                                  : '—'}
                            </td>
                            <td>{v.nf_numero ?? '—'}</td>
                            <td>
                              {v.data_validade ?? '—'}
                              {v.status_label ? (
                                <div className="muted">{v.status_label}</div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                {escolhidos
                  .filter((v) => v.partida_preview)
                  .map((v) => (
                    <PartidaDivisaoQuadro
                      key={`div-${v.lote_id}`}
                      preview={v.partida_preview!}
                      titulo={
                        v.faixa === 'partida' || v.partida_preview?.tipo === 'partida'
                          ? 'Partida — divisão da bobina'
                          : 'Passa — o que consome e o que volta'
                      }
                    />
                  ))}
              </div>
            </>
          ) : (
            <div className="op-escolha__un">
              {podeBaixar ? (
                <>
                  <label htmlFor="op-escolha-un">Quantas unidades vai levar</label>
                  <input
                    id="op-escolha-un"
                    className="op-escolha__un-input"
                    inputMode={peca ? 'numeric' : 'decimal'}
                    value={qtdeUn}
                    disabled={busy}
                    onChange={(e) => setQtdeUn(peca ? qtdeContadaDigitada(e.target.value) : e.target.value)}
                  />
                  <p className="muted">Informe o que vai levar agora.</p>
                </>
              ) : (
                <p className="muted">Quem tira da prateleira informa as unidades no estoque.</p>
              )}
            </div>
          )}

          {override && podeBaixar ? (
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label htmlFor="op-escolha-motivo">Motivo do outro volume</label>
              <input
                id="op-escolha-motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={busy}
                placeholder="Ex.: rasgo no rolo sugerido"
              />
            </div>
          ) : null}
        </div>

        <footer className="op-escolha__foot">
          {posPartida ? (
            <span />
          ) : modo === 'volume' && escolhidos.length > 0 && podeBaixar ? (
            <p className="op-escolha__soma">
              Levar {formatVolumesComArea(escolhidos.length, areaCarrinho)}
              {cobreNecessidade === true ? (
                <span className="muted"> · área coberta</span>
              ) : cobreNecessidade === false ? (
                <span className="muted"> · ainda abaixo da área pedida</span>
              ) : null}
            </p>
          ) : podeDevolver && modo === 'volume' && volsDevolverEscolhidos.length > 0 ? (
            <p className="op-escolha__soma">
              Devolver {volsDevolverEscolhidos.length}{' '}
              {volsDevolverEscolhidos.length === 1 ? 'volume' : 'volumes'}
              {volsDevolverEscolhidos.some(isRetornoPrevisto)
                ? ' · devolve o Passa'
                : ''}
            </p>
          ) : (
            <span />
          )}
          <div className="op-escolha__foot-actions">
            {posPartida ? (
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Fechar
              </button>
            ) : podeDevolver ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  busy ||
                  (modo === 'volume'
                    ? volsDevolverEscolhidos.length === 0
                    : parseQtdeDigitada(qtdeDevolver) <= 0)
                }
                onClick={() => void confirmarDevolver()}
              >
                Devolver à prateleira
              </button>
            ) : podeBaixar ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || (modo === 'volume' && escolhidos.length === 0)}
                onClick={() => void confirmar()}
              >
                Confirmar outro volume
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Fechar
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
