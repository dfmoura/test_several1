import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import {
  VOLUME_ETIQUETA_PRINT_HINT,
  VOLUME_ETIQUETA_PRINTER,
  enableVolumeEtiquetaPrintMode,
} from '../lib/volumeEtiquetaPrint';

type ConteudoCaixa = {
  modelo: string;
  modelo_ordem?: number | null;
  bobinas: number;
  etiquetas: string;
};

type FaceItem = {
  ordem?: number | null;
  descricao?: string | null;
  total_itens?: number | null;
};

type Face = {
  id: number;
  tipo: 'BOBINA' | 'CAIXA';
  codigo: string;
  sequencia: number;
  qtde_etiquetas: string;
  qtde_bobinas?: number;
  tubete?: string | null;
  qr_payload: string;
  pedido?: string | null;
  op?: string | null;
  descricao?: string | null;
  /** Arte do volume (bobina / caixa pura). */
  modelo?: string | null;
  modelo_nome?: string | null;
  modelo_ordem?: number | null;
  modelos_item?: string | null;
  /** Medida · papel · cores · acab. */
  produto?: string | null;
  /** Caixa: título sugerido (mista / pura). */
  hero?: string | null;
  caixa_medida?: string | null;
  caixa_seq?: number | null;
  total_caixas?: number | null;
  total_bobinas?: number | null;
  conteudo?: ConteudoCaixa[];
  mista?: boolean;
  item?: FaceItem | null;
};

type EtiquetasPayload = {
  embalagem?: { codigo?: string } | null;
  embalagens?: Array<{ codigo?: string }>;
  pedido?: { id: number; codigo: string } | null;
  bobinas: Face[];
  caixas: Face[];
  faces?: Face[];
};

/**
 * Conteúdo da caixa compacto (estrutura, não truncagem): `Frente A 3×3.000 · Verso B 2×2.000`.
 * Até 4 artes; depois `+N`. Overflow visual fica no CSS (line-clamp).
 */
function formatConteudoCaixa(conteudo: ConteudoCaixa[] | undefined): string | null {
  if (!conteudo || conteudo.length === 0) return null;
  const max = 4;
  const parts = conteudo.slice(0, max).map((c) => {
    const etiq = formatDecimalBr(Number(c.etiquetas), 0);
    return `${c.modelo.trim()} ${c.bobinas}×${etiq}`;
  });
  const extra = conteudo.length - parts.length;
  if (extra > 0) parts.push(`+${extra}`);
  return parts.join(' · ');
}

/** Só índice do item no PED multi — descrição completa já está em produto/modelo. */
function itemCurto(item: FaceItem | null | undefined): string | null {
  if (!item) return null;
  const total = item.total_itens ?? null;
  const ordem = item.ordem ?? null;
  if (ordem == null) return null;
  if (total != null && total > 1) return `${ordem}/${total}`;
  if (total == null || total > 1) return String(ordem);
  return null;
}

/**
 * Etiquetas de identificação BOB/CX — mídia Elgin 50×40.
 * Hierarquia: modelo do volume (hero) → QR + meta densa à direita.
 */
export function PaEmbalagemEtiquetasPage() {
  const { id, embId, pedidoId } = useParams();
  const [faces, setFaces] = useState<Face[]>([]);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [embCodigo, setEmbCodigo] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const voltarTo = pedidoId
    ? '/expedicao'
    : id
      ? `/ordens-producao/${id}`
      : '/expedicao';
  const voltarLabel = id && !pedidoId ? 'Voltar à OP' : 'Voltar à expedição';

  useEffect(() => enableVolumeEtiquetaPrintMode(), []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        let resData: EtiquetasPayload | null = null;

        if (pedidoId) {
          if (!/^\d+$/.test(pedidoId)) {
            setErr('Pedido inválido.');
            setFaces([]);
            return;
          }
          const res = await api.get<{ data: EtiquetasPayload }>(
            `/pedidos/${pedidoId}/embalagem/etiquetas`,
          );
          resData = res.data;
          const n = resData.embalagens?.length ?? 0;
          if (n > 1) {
            setEmbCodigo(
              `${resData.pedido?.codigo ?? 'PED'} · ${n} embalagens`,
            );
          } else if (resData.embalagem?.codigo) {
            setEmbCodigo(resData.embalagem.codigo);
          } else if (resData.embalagens?.[0]?.codigo) {
            setEmbCodigo(resData.embalagens[0].codigo);
          }
        } else {
          let targetId = embId;
          if (targetId && !/^\d+$/.test(targetId)) {
            setErr('Embalagem inválida. Abra as etiquetas pelo kit da expedição ou pela OP.');
            setFaces([]);
            return;
          }
          if (!targetId && id) {
            const op = await api.get<{
              data: { embalagem?: { id: number; codigo: string } | null };
            }>(`/ordens-producao/${id}`);
            const emb = op.data.embalagem;
            if (!emb?.id) {
              setErr('Confirme a embalagem na OP antes de imprimir.');
              setFaces([]);
              return;
            }
            setEmbCodigo(emb.codigo);
            targetId = String(emb.id);
          }
          if (!targetId || !/^\d+$/.test(targetId)) {
            setErr('Embalagem inválida.');
            setFaces([]);
            return;
          }
          const res = await api.get<{ data: EtiquetasPayload }>(
            `/pa-embalagens/${targetId}/etiquetas`,
          );
          resData = res.data;
          if (resData.embalagem?.codigo) {
            setEmbCodigo(resData.embalagem.codigo);
          }
        }

        if (!resData) {
          setErr('Embalagem inválida.');
          setFaces([]);
          return;
        }

        const all: Face[] =
          resData.faces && resData.faces.length > 0
            ? resData.faces.map((f) => ({
                ...f,
                tipo: f.tipo ?? ('CAIXA' as const),
              }))
            : [
                ...(resData.caixas ?? []).map((c) => ({ ...c, tipo: 'CAIXA' as const })),
                ...(resData.bobinas ?? []).map((b) => ({ ...b, tipo: 'BOBINA' as const })),
              ];
        if (all.length === 0) {
          setErr('Nenhuma etiqueta BOB/CX confirmada neste pedido.');
          setFaces([]);
          return;
        }
        setFaces(all);
        const map: Record<string, string> = {};
        await Promise.all(
          all.map(async (f) => {
            map[f.qr_payload] = await QRCode.toDataURL(f.qr_payload, {
              width: VOLUME_ETIQUETA_PRINTER.qrRenderPx,
              margin: VOLUME_ETIQUETA_PRINTER.qrQuietModules,
              errorCorrectionLevel: 'M',
              color: { dark: '#000000', light: '#ffffff' },
            });
          }),
        );
        setQrs(map);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Falha ao carregar etiquetas.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, embId, pedidoId]);

  return (
    <div className="page">
      <PageHeader
        title="Etiquetas de embalagem PA"
        description={embCodigo ? `${embCodigo} · ${VOLUME_ETIQUETA_PRINT_HINT}` : VOLUME_ETIQUETA_PRINT_HINT}
        actions={
          <div className="btn-row no-print">
            <Link to={voltarTo} className="btn btn-secondary">
              {voltarLabel}
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.print()}
              disabled={!faces.length}
            >
              Imprimir
            </button>
          </div>
        }
      />
      {loading ? <p className="muted no-print">Carregando…</p> : null}
      {err ? (
        <p className="form-error no-print" role="alert">
          {err}
        </p>
      ) : null}
      <div className="vol-etiquetas-print-grid">
        {faces.map((f) => {
          const modeloNome =
            f.modelo_nome?.trim() || f.modelo?.trim() || null;
          const produto = f.produto?.trim() || null;
          const desc = f.descricao?.trim() || null;
          // Bobina: produto no hero · arte na linha Mod. (não misturar).
          // Caixa: hero API (mista/pura) · Mod. só se pura · conteúdo se mista.
          const modeloLinha =
            f.tipo === 'BOBINA'
              ? modeloNome
              : f.tipo === 'CAIXA' && !f.mista
                ? modeloNome ||
                  (f.conteudo?.length === 1 ? f.conteudo[0].modelo.trim() : null)
                : null;
          const titulo =
            f.tipo === 'CAIXA' && f.mista
              ? f.hero?.trim() ||
                (f.conteudo && f.conteudo.length > 0
                  ? `${f.conteudo.length} modelos`
                  : null) ||
                produto ||
                desc
              : produto || desc || modeloLinha;
          // Produto já é hero em bobina/caixa pura; em mista pode repetir abaixo do hero.
          const produtoLinha =
            f.tipo === 'CAIXA' && f.mista && produto && produto !== titulo
              ? produto
              : null;
          const conteudoLinha =
            f.tipo === 'CAIXA' && f.mista ? formatConteudoCaixa(f.conteudo) : null;
          const itemTxt = itemCurto(f.item);
          const totalBob = f.total_bobinas ?? null;
          const totalCx = f.total_caixas ?? null;
          const sku =
            f.tipo === 'CAIXA'
              ? `CX ${f.sequencia}${totalCx ? `/${totalCx}` : ''}${f.mista ? ' MISTA' : ''}`
              : `BOB ${f.sequencia}${totalBob ? `/${totalBob}` : ''}${
                  f.caixa_seq != null
                    ? ` · CX ${f.caixa_seq}${totalCx ? `/${totalCx}` : ''}`
                    : ''
                }`;
          const qtdeTxt = [
            `${formatDecimalBr(Number(f.qtde_etiquetas), 0)} etiq.`,
            f.tipo === 'CAIXA' && f.qtde_bobinas != null
              ? `${f.qtde_bobinas} bob.`
              : null,
          ]
            .filter(Boolean)
            .join(' · ');
          const embTxt = [f.tubete, f.caixa_medida].filter(Boolean).join(' · ');
          const qtdeEmb = embTxt ? `${qtdeTxt} · ${embTxt}` : qtdeTxt;
          const pedOp = [f.pedido, f.op].filter(Boolean).join(' · ') || '—';

          return (
            <article
              key={`${f.tipo}-${f.id}`}
              className="vol-etiqueta-sheet"
              aria-label={`Etiqueta ${f.tipo} ${f.codigo}`}
            >
              <div className="vol-etiqueta-face vol-etiqueta-face--pa">
                {titulo ? (
                  <div className="vol-etiqueta-titulo" title={titulo}>
                    {titulo}
                  </div>
                ) : null}
                <div className="vol-etiqueta-qr">
                  {qrs[f.qr_payload] ? (
                    <img src={qrs[f.qr_payload]} alt="" width={240} height={240} />
                  ) : (
                    <div className="vol-etiqueta-qr-ph" aria-hidden />
                  )}
                </div>
                <div className="vol-etiqueta-meta">
                  <div className="vol-etiqueta-sku" title={sku}>
                    {sku}
                  </div>
                  {modeloLinha ? (
                    <div
                      className="vol-etiqueta-row vol-etiqueta-row--wrap vol-etiqueta-modelo"
                      title={modeloLinha}
                    >
                      <span className="vol-etiqueta-k">Mod.</span> {modeloLinha}
                    </div>
                  ) : null}
                  {produtoLinha ? (
                    <div className="vol-etiqueta-desc" title={produtoLinha}>
                      {produtoLinha}
                    </div>
                  ) : null}
                  {conteudoLinha ? (
                    <div
                      className="vol-etiqueta-desc vol-etiqueta-conteudo"
                      title={
                        f.conteudo
                          ?.map(
                            (c) =>
                              `${c.modelo}: ${c.bobinas} bob · ${formatDecimalBr(Number(c.etiquetas), 0)}`,
                          )
                          .join(' | ') ?? conteudoLinha
                      }
                    >
                      {conteudoLinha}
                    </div>
                  ) : null}
                  {itemTxt ? (
                    <div
                      className="vol-etiqueta-row"
                      title={`Item ${itemTxt}${f.item?.descricao ? ` · ${f.item.descricao}` : ''}`}
                    >
                      <span className="vol-etiqueta-k">Item</span> {itemTxt}
                    </div>
                  ) : null}
                  <div className="vol-etiqueta-row vol-etiqueta-row--wrap" title={f.codigo}>
                    <span className="vol-etiqueta-k">Cód.</span> {f.codigo}
                  </div>
                  <div className="vol-etiqueta-row vol-etiqueta-row--wrap" title={qtdeEmb}>
                    <span className="vol-etiqueta-k">Qtde</span> {qtdeEmb}
                  </div>
                  <div className="vol-etiqueta-row vol-etiqueta-row--muted" title={pedOp}>
                    {pedOp}
                  </div>
                </div>
                <div className="vol-etiqueta-hri" title={f.qr_payload}>
                  {f.qr_payload}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
