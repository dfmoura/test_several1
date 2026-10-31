import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
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
import type { EstoqueQrVolumeInfo } from '../lib/estoqueQrFila';
import {
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

type PainelJaSaiu = 'devolver' | 'estragou';

type Props = {
  op: OrdemProducao;
  material: OrdemProducaoMaterial;
  porta: 'op' | 'chao';
  canWrite: boolean;
  /** Abre já no painel certo (lista: Devolver × Estragou). */
  inicio?: PainelJaSaiu;
  onClose: () => void;
  onOp: (data: OrdemProducao) => void;
};

function qtdeCanon(n: number): string {
  return n.toFixed(4);
}

/**
 * Exceção: outro volume (com motivo), devolver, ou estragou → avaria + pegar de novo.
 * Happy path FEFO fica no kit (botão Saiu / Confirmar saída sugerida).
 * Avaria só na porta estoque (ADR_OP_FICHA_KIT — uma porta).
 */
export function OpEscolhaOverlay({
  op,
  material,
  porta,
  canWrite,
  inicio = 'devolver',
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
  /** Avaria + complementar: só A buscar (lista de retirada). */
  const podeAvaria = noEstoque && canWrite && estado === 'ja_saiu';

  const [painelJaSaiu, setPainelJaSaiu] = useState<PainelJaSaiu>(() =>
    podeAvaria && inicio === 'estragou' ? 'estragou' : 'devolver',
  );

  const volsADevolver = useMemo(
    () =>
      material.retirada?.volumes_a_devolver?.length
        ? material.retirada.volumes_a_devolver
        : (material.retirada?.volumes_baixados ?? []),
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
  const [devolverMarcados, setDevolverMarcados] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const v of volsADevolver) {
      if (v.lote_id) init[v.lote_id] = false;
    }
    return init;
  });
  const [filtro, setFiltro] = useState<VolumeFiltroEstado>(VOLUME_FILTRO_VAZIO);
  const [qr, setQr] = useState('');
  const peca = unidadeContada(material.unidade);
  const saiu = parseQtdeDigitada(material.qtde_requisitada);
  const avariaAtual = parseQtdeDigitada(material.qtde_avaria);
  const devolverInteiro = peca && qtdeContadaInteira(saiu);
  const avariaInteiro = peca && qtdeContadaInteira(saiu);
  const [qtdeUn, setQtdeUn] = useState(() =>
    peca ? qtdeContadaExibida(material.qtde_planejada ?? alvo) : (material.qtde_planejada ?? String(alvo || '')),
  );
  const [qtdeDevolver, setQtdeDevolver] = useState(() =>
    devolverInteiro ? qtdeContadaExibida(saiu) : String(saiu || ''),
  );
  const [qtdeAvaria, setQtdeAvaria] = useState(() => {
    if (avariaAtual > 0) {
      return avariaInteiro ? qtdeContadaExibida(material.qtde_avaria) : String(material.qtde_avaria);
    }
    return devolverInteiro ? qtdeContadaExibida(saiu) : String(saiu || '');
  });
  const [motivoAvaria, setMotivoAvaria] = useState(() => material.motivo_avaria ?? '');
  const [qtdeRepo, setQtdeRepo] = useState(() => {
    const base = avariaAtual > 0 ? avariaAtual : 0;
    if (base <= 0) return '';
    return avariaInteiro ? qtdeContadaExibida(base) : String(base);
  });
  const [motivo, setMotivo] = useState('');
  const [motivoDevolver, setMotivoDevolver] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const qrRef = useRef<HTMLInputElement>(null);
  const volsVisiveis = useMemo(() => filtrarVolumesEscolha(vols, filtro), [vols, filtro]);

  const emReposicao = estado === 'ja_saiu' && painelJaSaiu === 'estragou' && podeAvaria;
  const podeComplementar = emReposicao;

  useEffect(() => {
    if (modo !== 'volume') return;
    if (estado === 'ja_saiu' && !emReposicao) return;
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
  }, [modo, estado, emReposicao, op.id, material.id]);

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
    if ((!podeBaixar && !podeComplementar) || modo !== 'volume') return;
    const t = window.setTimeout(() => qrRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [podeBaixar, podeComplementar, modo, material.id]);

  useEffect(() => {
    const a = parseQtdeDigitada(material.qtde_avaria);
    if (a <= 0) return;
    setQtdeRepo((prev) =>
      parseQtdeDigitada(prev) > 0 ? prev : avariaInteiro ? qtdeContadaExibida(a) : String(a),
    );
    setMotivoAvaria((prev) => (prev.trim() ? prev : (material.motivo_avaria ?? '')));
  }, [material.qtde_avaria, material.motivo_avaria, avariaInteiro]);

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
  /** FEFO override só na 1ª saída; complementar = reposição, sem travar motivo. */
  const override =
    !emReposicao &&
    modo === 'volume' &&
    mesmoSku &&
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
    if (!p || (!podeBaixar && !podeComplementar) || modo !== 'volume') return;
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
    if (modo === 'volume') {
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
      const payload =
        modo === 'volume'
          ? {
              material_id: material.id,
              motivo: motivoDevolver.trim(),
              volumes: volsDevolverEscolhidos.map((v) => ({
                lote_id: v.lote_id as number,
                qtde: qtdeCanon(parseQtdeDigitada(v.qtde_retirar) || qtdeVolumeTotal(v)),
              })),
            }
          : {
              material_id: material.id,
              motivo: motivoDevolver.trim(),
              qtde: qtdeCanon(parseQtdeDigitada(qtdeDevolver)),
            };
      const res = await api.post<{ data: OrdemProducao }>(
        `/estoque/retiradas/${op.id}/devolver`,
        payload,
      );
      onOp(res.data);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao devolver.');
    } finally {
      setBusy(false);
    }
  };

  const registrarAvaria = async () => {
    if (!podeAvaria) return;
    if (parseQtdeDigitada(qtdeAvaria) <= 0) {
      setErr('Informe a quantidade avariada.');
      return;
    }
    if (avariaInteiro && !qtdeContadaInteira(parseQtdeDigitada(qtdeAvaria))) {
      setErr('A quantidade tem de ser inteira.');
      return;
    }
    if (motivoAvaria.trim().length < 3) {
      setErr('Informe o motivo da avaria (mínimo 3 caracteres).');
      return;
    }
    if (parseQtdeDigitada(qtdeAvaria) - saiu > 1e-9) {
      setErr('Avaria não pode exceder o que saiu da prateleira.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(`/estoque/retiradas/${op.id}/avaria`, {
        material_id: material.id,
        qtde: qtdeCanon(parseQtdeDigitada(qtdeAvaria)),
        motivo: motivoAvaria.trim(),
      });
      onOp(res.data);
      const q = parseQtdeDigitada(qtdeAvaria);
      setQtdeRepo(avariaInteiro ? qtdeContadaExibida(q) : String(q));
      setMsg('Avaria apontada. Pegue de novo a quantidade que falta — sem devolver o danificado.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao registrar avaria.');
    } finally {
      setBusy(false);
    }
  };

  const confirmarComplementar = async () => {
    if (!podeComplementar) return;
    if (modo === 'volume') {
      if (escolhidos.length === 0) {
        setErr('Marque ou escaneie as bobinas da reposição.');
        return;
      }
    } else if (parseQtdeDigitada(qtdeRepo) <= 0) {
      setErr('Informe a quantidade a pegar de novo.');
      return;
    } else if (avariaInteiro && !qtdeContadaInteira(parseQtdeDigitada(qtdeRepo))) {
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
              complementar: true,
              volumes: escolhidos.map((v) => ({
                lote_id: v.lote_id as number,
                qtde: qtdeCanon(qtdeVolumeTotal(v)),
              })),
            }
          : {
              material_id: material.id,
              qtde: qtdeCanon(parseQtdeDigitada(qtdeRepo)),
              complementar: true,
            };
      const res = await api.post<{ data: OrdemProducao }>(`/estoque/retiradas/${op.id}/confirmar`, {
        linhas: [linha],
      });
      onOp(res.data);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao pegar de novo.');
    } finally {
      setBusy(false);
    }
  };

  const tipo = opComponenteLabel(material.componente);
  const leitura = leituraNecessidadeOp(material, op);
  const mostrarPickerVolume = (podeBaixar || podeComplementar) && modo === 'volume';

  const hint =
    estado === 'ja_saiu'
      ? painelJaSaiu === 'estragou'
        ? 'Material danificado: aponte a avaria e pegue de novo na prateleira. Não devolva o que estragou.'
        : podeDevolver
          ? 'Marque o que volta à prateleira (ainda bom, antes de concluir a OP).'
          : 'Já saiu. Peça a quem tem estoque para devolver à prateleira.'
      : modo === 'volume'
        ? 'Outro volume — marque o que vai levar e informe o motivo (FEFO fica no botão Saiu da lista).'
        : 'Ajuste a quantidade se diferir do pedido (o botão Saiu da lista usa a qtde sugerida).';

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
            <p className="muted op-escolha__hint">{hint}</p>
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
            {avariaAtual > 0 ? (
              <div className="op-escolha__precisa op-escolha__precisa--avaria">
                <span>Avaria</span>
                <strong>{formatQtdePick(avariaAtual, material.unidade)}</strong>
              </div>
            ) : null}
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Fechar
            </button>
          </div>
        </header>

        {estado === 'ja_saiu' && (podeDevolver || podeAvaria) ? (
          <div className="op-escolha__tabs" role="tablist" aria-label="O que fazer com o material">
            {podeDevolver ? (
              <button
                type="button"
                role="tab"
                aria-selected={painelJaSaiu === 'devolver'}
                className={`op-escolha__tab${painelJaSaiu === 'devolver' ? ' is-on' : ''}`}
                disabled={busy}
                onClick={() => {
                  setPainelJaSaiu('devolver');
                  setErr(null);
                  setMsg(null);
                }}
              >
                Devolver
              </button>
            ) : null}
            {podeAvaria ? (
              <button
                type="button"
                role="tab"
                aria-selected={painelJaSaiu === 'estragou'}
                className={`op-escolha__tab${painelJaSaiu === 'estragou' ? ' is-on' : ''}`}
                disabled={busy}
                onClick={() => {
                  setPainelJaSaiu('estragou');
                  setErr(null);
                  setMsg(null);
                }}
              >
                Estragou
              </button>
            ) : null}
          </div>
        ) : null}

        {mostrarPickerVolume && !emReposicao ? (
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
          {estado === 'ja_saiu' && painelJaSaiu === 'devolver' ? (
            podeDevolver ? (
              modo === 'volume' ? (
                <>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Volumes ainda fora da prateleira nesta OP — só o que ainda serve.
                  </p>
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
                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label htmlFor="op-escolha-motivo-dev">Motivo da devolução</label>
                    <input
                      id="op-escolha-motivo-dev"
                      value={motivoDevolver}
                      onChange={(e) => setMotivoDevolver(e.target.value)}
                      disabled={busy}
                      placeholder="Ex.: sobrou na mesa / pegou a bobina errada"
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
          ) : estado === 'ja_saiu' && painelJaSaiu === 'estragou' ? (
            podeAvaria ? (
              <>
                <section className="op-escolha__bloco" aria-labelledby="op-escolha-avaria-title">
                  <h3 id="op-escolha-avaria-title" className="op-escolha__bloco-title">
                    1. Aponte a avaria
                  </h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    O danificado não volta à prateleira. Só marca na OP (sem novo movimento de saldo).
                  </p>
                  <div className="op-escolha__avaria-row">
                    <div className="form-group">
                      <label htmlFor="op-escolha-avaria-qtde">Qtde avariada</label>
                      <input
                        id="op-escolha-avaria-qtde"
                        className="op-escolha__un-input"
                        inputMode={avariaInteiro ? 'numeric' : 'decimal'}
                        value={qtdeAvaria}
                        disabled={busy}
                        onChange={(e) =>
                          setQtdeAvaria(
                            avariaInteiro ? qtdeContadaDigitada(e.target.value) : e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="op-escolha-avaria-motivo">Motivo</label>
                      <input
                        id="op-escolha-avaria-motivo"
                        value={motivoAvaria}
                        onChange={(e) => setMotivoAvaria(e.target.value)}
                        disabled={busy}
                        placeholder="Ex.: rasgou na mesa / umedeceu"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busy || parseQtdeDigitada(qtdeAvaria) <= 0}
                    onClick={() => void registrarAvaria()}
                  >
                    Registrar avaria
                  </button>
                </section>

                <section className="op-escolha__bloco" aria-labelledby="op-escolha-repo-title">
                  <h3 id="op-escolha-repo-title" className="op-escolha__bloco-title">
                    2. Pegar de novo
                  </h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Nova baixa na mesma OP (complementar). Preferível depois de apontar a avaria.
                  </p>

                  {modo === 'volume' ? (
                    <>
                      {mostrarPickerVolume ? (
                        <div
                          className={`op-escolha__progresso${escolhidos.length > 0 ? ' is-ok' : ''}`}
                          aria-live="polite"
                        >
                          <div className="op-escolha__progresso-item">
                            <span>Reposição (área)</span>
                            <strong>
                              {escolhidos.length === 0
                                ? '—'
                                : formatVolumesComArea(escolhidos.length, areaCarrinho)}
                            </strong>
                          </div>
                          <div className="op-escolha__progresso-item">
                            <span>Volumes</span>
                            <strong>
                              {escolhidos.length === 0
                                ? 'Nenhum'
                                : `${escolhidos.length} marcado${escolhidos.length === 1 ? '' : 's'}`}
                            </strong>
                          </div>
                        </div>
                      ) : null}

                      <div className="form-group op-escolha__qr">
                        <label htmlFor="op-escolha-qr-repo">Ler volume (VOL:…)</label>
                        <input
                          id="op-escolha-qr-repo"
                          ref={qrRef}
                          value={qr}
                          disabled={busy}
                          onChange={(e) => setQr(e.target.value)}
                          onKeyDown={onQrKey}
                          placeholder="Pistola ou digite — Enter marca o volume"
                          autoComplete="off"
                        />
                      </div>

                      <OpFiltroVolumes
                        idPrefix="op-escolha-repo"
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
                              <th className="op-escolha__col-check">Levar</th>
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
                                <td colSpan={8} className="muted">
                                  Carregando o estoque…
                                </td>
                              </tr>
                            ) : vols.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="muted">
                                  Nenhum volume com saldo nesta empresa.
                                </td>
                              </tr>
                            ) : volsVisiveis.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="muted">
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
                                    className={[on ? 'is-on' : '', sugerido ? 'is-fefo' : '']
                                      .filter(Boolean)
                                      .join(' ')}
                                  >
                                    <td className="op-escolha__col-check">
                                      <input
                                        type="checkbox"
                                        checked={on}
                                        disabled={busy}
                                        aria-label={`Levar ${formatLotePick(v)}`}
                                        onChange={() => marcarVolume(id, !on)}
                                      />
                                    </td>
                                    <td>
                                      <strong>{formatLotePick(v)}</strong>
                                      {v.descricao ? <div>{v.descricao}</div> : null}
                                      {v.sku ? <div className="muted">{v.sku}</div> : null}
                                    </td>
                                    <td>{area != null ? formatQtdePick(area, 'm²') : '—'}</td>
                                    <td>
                                      {dim ?? '—'}
                                      {metros && dim ? (
                                        <div className="muted" style={{ fontSize: '0.85em' }}>
                                          {metros} de rolo
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
                      </div>
                    </>
                  ) : (
                    <div className="op-escolha__un">
                      <label htmlFor="op-escolha-repo-un">Quantidade a pegar de novo</label>
                      <input
                        id="op-escolha-repo-un"
                        className="op-escolha__un-input"
                        inputMode={avariaInteiro ? 'numeric' : 'decimal'}
                        value={qtdeRepo}
                        disabled={busy}
                        onChange={(e) =>
                          setQtdeRepo(
                            avariaInteiro ? qtdeContadaDigitada(e.target.value) : e.target.value,
                          )
                        }
                      />
                      <p className="muted">
                        Sugestão = qtde avariada
                        {avariaAtual > 0
                          ? ` (${formatQtdePick(avariaAtual, material.unidade)})`
                          : ''}
                        .
                      </p>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <p className="muted">
                Avaria e reposição ficam em Estoque · A buscar, com permissão de estoque.
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
                            </td>
                            <td>{area != null ? formatQtdePick(area, 'm²') : '—'}</td>
                            <td>
                              {dim ?? '—'}
                              {metros && dim ? (
                                <div className="muted" style={{ fontSize: '0.85em' }}>
                                  {metros} de rolo
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
          {modo === 'volume' && escolhidos.length > 0 && (podeBaixar || podeComplementar) ? (
            <p className="op-escolha__soma">
              {podeComplementar ? 'Repor' : 'Levar'}{' '}
              {formatVolumesComArea(escolhidos.length, areaCarrinho)}
              {!podeComplementar && cobreNecessidade === true ? (
                <span className="muted"> · área coberta</span>
              ) : !podeComplementar && cobreNecessidade === false ? (
                <span className="muted"> · ainda abaixo da área pedida</span>
              ) : null}
            </p>
          ) : podeDevolver &&
            painelJaSaiu === 'devolver' &&
            modo === 'volume' &&
            volsDevolverEscolhidos.length > 0 ? (
            <p className="op-escolha__soma">
              Devolver {volsDevolverEscolhidos.length}{' '}
              {volsDevolverEscolhidos.length === 1 ? 'volume' : 'volumes'}
            </p>
          ) : (
            <span />
          )}
          <div className="op-escolha__foot-actions">
            {estado === 'ja_saiu' && painelJaSaiu === 'estragou' && podeComplementar ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  busy ||
                  (modo === 'volume'
                    ? escolhidos.length === 0
                    : parseQtdeDigitada(qtdeRepo) <= 0)
                }
                onClick={() => void confirmarComplementar()}
              >
                Pegar de novo
              </button>
            ) : podeDevolver && painelJaSaiu === 'devolver' ? (
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
