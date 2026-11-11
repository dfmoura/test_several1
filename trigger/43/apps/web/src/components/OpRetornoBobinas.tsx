import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  api,
  type OpRetiradaVolume,
  type OrdemProducao,
  type OrdemProducaoMaterial,
} from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { formatQtdePick } from '../lib/producaoPick';
import {
  bobinasRetornoPendentes,
  rotuloBobinaRetorno,
  type BobinaRetornoUi,
} from '../lib/partidaUi';
import { parseQtdeDigitada } from '../lib/producaoUi';
import { rotuloLocal, type LocalSaldo } from './LocalSaldoCampo';

function qtdeCanon(n: number): string {
  return n.toFixed(4);
}

type BobinaRetorno = BobinaRetornoUi & {
  /** Derivada do Passa no cliente — some se a API ainda não hidratou. */
  provisoria?: boolean;
};

type Props = {
  op: OrdemProducao;
  material: OrdemProducaoMaterial;
  /** Passa do balanço Precisa·Saiu·Passa (m²). */
  passaM2: number;
  passaM: number | null;
  larguraMm: number;
  baixados: OpRetiradaVolume[];
  podeEstoque: boolean;
  canWrite: boolean;
  busy: boolean;
  onBusy: (v: boolean) => void;
  onOp: (data: OrdemProducao) => void;
  onErr: (msg: string | null) => void;
};

function bobinasDoPlano(m: OrdemProducaoMaterial): BobinaRetorno[] {
  return bobinasRetornoPendentes(m);
}

/**
 * Fallback só para Passa de comprimento com **1** volume baixado, enquanto a API hidrata.
 * Com N>1 bobinas físicas nunca agrega Passa numa linha só — aguarda `partida_prevista`.
 */
function bobinasDoPassa(args: {
  passaM2: number;
  passaM: number | null;
  larguraMm: number;
  baixados: OpRetiradaVolume[];
}): BobinaRetorno[] {
  if (!(args.passaM2 > 1e-4)) return [];
  // Se já há preview de partida no baixado, não colapsar em 1 linha.
  const prev = args.baixados.find((v) => v.partida_preview)?.partida_preview;
  if (prev?.refile || prev?.tipo === 'partida') return [];
  const pais = args.baixados
    .filter((v) => (v.lote_id ?? 0) > 0 && !v.avariado)
    .map((v) => v.lote_id as number);
  const unicos = [...new Set(pais.length > 0 ? pais : args.baixados.map((v) => v.lote_id).filter(Boolean))];
  // N volumes → o motor aloca C_u por bobina; fallback agregado enganaria (ex.: 155×1735).
  if (unicos.length !== 1) return [];
  const pai = Number(unicos[0]);
  if (!pai) return [];
  const L =
    args.larguraMm > 0
      ? String(args.larguraMm)
      : String(args.baixados.find((v) => v.lote_id === pai)?.largura_mm ?? '');
  const C =
    args.passaM != null && args.passaM > 1e-4
      ? String(args.passaM)
      : args.larguraMm > 0
        ? String((args.passaM2 * 1000) / args.larguraMm)
        : '';
  return [
    {
      chave: `${pai}-sobra-passa`,
      lote_pai_id: pai,
      tipo: 'sobra',
      largura_mm: L,
      comprimento_m: C,
      area_m2: String(args.passaM2),
      qtde: qtdeCanon(args.passaM2),
      status: 'pendente',
      provisoria: true,
    },
  ];
}

function rotuloTipo(tipo: string): string {
  return rotuloBobinaRetorno(tipo);
}

type Celula = { key: string; label: string; num?: boolean; node: ReactNode; title?: string };

/**
 * No Papel/Acabamento (Já saiu): o que volta ao estoque — 1 bobina / largura × metro,
 * com Local no mesmo padrão da tabela do kit. Nunca some com Passa > 0.
 */
export function OpRetornoBobinas({
  op,
  material,
  passaM2,
  passaM,
  larguraMm,
  baixados,
  podeEstoque,
  canWrite,
  busy,
  onBusy,
  onOp,
  onErr,
}: Props) {
  const doPlano = useMemo(() => bobinasDoPlano(material), [material]);
  const doPassa = useMemo(
    () =>
      doPlano.length > 0
        ? []
        : bobinasDoPassa({ passaM2, passaM, larguraMm, baixados }),
    [doPlano.length, passaM2, passaM, larguraMm, baixados],
  );
  const bobinas = doPlano.length > 0 ? doPlano : doPassa;
  const temPassa = passaM2 > 1e-4;
  const [locais, setLocais] = useState<LocalSaldo[]>([]);
  const [escolha, setEscolha] = useState<Record<string, string>>({});
  const [etiquetasIds, setEtiquetasIds] = useState<number[]>([]);
  const [hidratando, setHidratando] = useState(false);
  const hidratoTicket = useRef(0);
  /** Uma tentativa de hidratar por material — evita loop GET↔onOp. */
  const hidratouMat = useRef<number | null>(null);

  useEffect(() => {
    let vivo = true;
    void api
      .get<{ data: LocalSaldo[] }>('/estoque/enderecos')
      .then((res) => {
        if (vivo) setLocais(res.data ?? []);
      })
      .catch(() => {
        if (vivo) setLocais([]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    setEtiquetasIds([]);
    hidratouMat.current = null;
  }, [material.id]);

  // Sem plano mas com Passa: GET OP força hidratação no show (motor).
  useEffect(() => {
    if (doPlano.length > 0 || !temPassa) return;
    if (hidratouMat.current === material.id) return;
    hidratouMat.current = material.id;
    const ticket = ++hidratoTicket.current;
    setHidratando(true);
    void api
      .get<{ data: OrdemProducao }>(`/ordens-producao/${op.id}`)
      .then((res) => {
        if (hidratoTicket.current !== ticket) return;
        onOp(res.data);
      })
      .catch(() => {
        /* fallback visual doPassa permanece */
      })
      .finally(() => {
        if (hidratoTicket.current === ticket) setHidratando(false);
      });
  }, [doPlano.length, temPassa, material.id, op.id, onOp]);

  if (bobinas.length === 0 && etiquetasIds.length === 0 && !temPassa) {
    return null;
  }

  const podeConfirmar = podeEstoque && canWrite;
  const locaisOk =
    bobinas.length > 0 && bobinas.every((b) => Number(escolha[b.chave] ?? 0) > 0);
  const soProvisoria = bobinas.length > 0 && bobinas.every((b) => b.provisoria);

  const confirmar = async () => {
    if (!podeConfirmar || busy) return;
    if (bobinas.length === 0) {
      onErr('Aguarde o plano de retorno ou atualize a ordem.');
      return;
    }
    if (!locaisOk) {
      onErr('Informe o local de cada bobina antes de devolver.');
      return;
    }
    onBusy(true);
    onErr(null);
    try {
      // Se só há preview do Passa, re-GET para materializar plano no servidor.
      let matWork = material;
      if (soProvisoria) {
        const fresh = await api.get<{ data: OrdemProducao }>(`/ordens-producao/${op.id}`);
        onOp(fresh.data);
        matWork = (fresh.data.materiais ?? []).find((x) => x.id === material.id) ?? material;
      }
      const oficiais = bobinasDoPlano(matWork);
      const usar = oficiais.length > 0 ? oficiais : bobinas;
      if (usar.length === 0) {
        onErr('Não foi possível montar as bobinas de retorno. Atualize a ordem e tente de novo.');
        return;
      }
      const porPai = new Map<number, number>();
      for (const b of usar) {
        const area = parseQtdeDigitada(b.qtde);
        porPai.set(b.lote_pai_id, (porPai.get(b.lote_pai_id) ?? 0) + area);
      }
      const volumes = [...porPai.entries()].map(([lote_id, qtde]) => ({
        lote_id,
        qtde: qtdeCanon(qtde),
      }));
      // Locais: mapeia por tipo+pai (provisória sobra → sobra oficial).
      const locaisPayload = usar.map((b) => {
        const chaveUi =
          escolha[b.chave] != null && escolha[b.chave] !== ''
            ? b.chave
            : Object.keys(escolha).find((k) => k.endsWith(`-${b.tipo}`)) ?? b.chave;
        const end =
          Number(escolha[b.chave] ?? 0) ||
          Number(escolha[`${b.lote_pai_id}-${b.tipo}`] ?? 0) ||
          Number(escolha[chaveUi] ?? 0) ||
          Number(escolha[`${b.lote_pai_id}-sobra-passa`] ?? 0);
        return {
          lote_pai_id: b.lote_pai_id,
          tipo: b.tipo,
          endereco_id: end,
        };
      });
      if (locaisPayload.some((l) => l.endereco_id <= 0)) {
        onErr('Informe o local de cada bobina antes de devolver.');
        return;
      }
      const res = await api.post<{ data: OrdemProducao }>(
        `/estoque/retiradas/${op.id}/devolver`,
        {
          material_id: material.id,
          motivo: 'Passa — devolver bobinas ao estoque',
          volumes,
          locais: locaisPayload,
        },
      );
      onOp(res.data);
      const matPos = (res.data.materiais ?? []).find((x) => x.id === material.id);
      const gerados = (matPos?.partida_prevista ?? [])
        .filter((p) => p.status === 'devolvido')
        .flatMap((p) => p.volumes_gerados ?? []);
      const ids = gerados
        .map((g) => Number(g.lote_id))
        .filter((id) => Number.isFinite(id) && id > 0);
      setEtiquetasIds(ids);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? (e.details ? Object.values(e.details)[0]?.[0] : undefined) ?? e.message
          : e instanceof Error
            ? e.message
            : 'Falha ao devolver bobinas.';
      onErr(msg);
    } finally {
      onBusy(false);
    }
  };

  const linhas: { id: string; cols: Celula[] }[] =
    bobinas.length > 0
      ? bobinas.map((b) => ({
          id: b.chave,
          cols: [
            {
              key: 'produto',
              label: 'O que volta',
              node: (
                <span title={rotuloTipo(b.tipo)}>
                  {rotuloTipo(b.tipo)}
                  {b.provisoria ? ' · previsto' : ''}
                </span>
              ),
            },
            {
              key: 'medida',
              label: 'Medida',
              node: [
                b.largura_mm
                  ? `${formatDecimalBr(b.largura_mm, 1, { stripTrailingZeros: true })} mm`
                  : '',
                b.comprimento_m
                  ? `${formatDecimalBr(b.comprimento_m, 1, { stripTrailingZeros: true })} m`
                  : '',
              ]
                .filter(Boolean)
                .join(' × ') || '—',
            },
            {
              key: 'm2',
              label: 'm²',
              num: true,
              title: 'Metro quadrado',
              node: formatQtdePick(parseQtdeDigitada(b.area_m2 || b.qtde), 'm²'),
            },
            {
              key: 'ml',
              label: 'm',
              num: true,
              title: 'Metro linear',
              node: b.comprimento_m
                ? formatQtdePick(parseQtdeDigitada(b.comprimento_m), 'm')
                : '—',
            },
            {
              key: 'local',
              label: 'Local',
              node: (
                <select
                  aria-label={`Local — ${rotuloTipo(b.tipo)}`}
                  disabled={busy || !podeConfirmar}
                  value={escolha[b.chave] ?? ''}
                  onChange={(e) =>
                    setEscolha((prev) => ({ ...prev, [b.chave]: e.target.value }))
                  }
                >
                  <option value="">Escolher local</option>
                  {locais.map((l) => (
                    <option key={l.id} value={String(l.id)}>
                      {rotuloLocal(l) || l.codigo}
                    </option>
                  ))}
                </select>
              ),
            },
          ],
        }))
      : [];

  return (
    <div className="orc-faixas-bloco op-insumo-retorno" style={{ marginTop: '0.5rem' }}>
      <p className="form-hint" style={{ marginTop: 0, marginBottom: '0.35rem' }}>
        <strong>O que volta ao estoque</strong>
        {bobinas.length > 1
          ? ` — ${bobinas.length} bobinas (${bobinas.map((b) => rotuloTipo(b.tipo)).join(' + ')}) · ${formatQtdePick(passaM2 > 0 ? passaM2 : bobinas.reduce((a, b) => a + parseQtdeDigitada(b.qtde), 0), 'm²')}`
          : temPassa
            ? ` — ${formatQtdePick(passaM2, 'm²')}${
                passaM != null && passaM > 1e-4 ? ` · ${formatQtdePick(passaM, 'm')}` : ''
              }`
            : ''}
        . A faixa da produção já foi consumida (não vira volume). Cada linha abaixo é uma bobina
        física (mesmo SKU). Informe o <strong>Local</strong> de cada uma, confirme e imprima as
        etiquetas (face VOL: sem local).
        {hidratando ? ' Atualizando plano…' : ''}
      </p>

      {linhas.length > 0 ? (
        <div className="table-wrap op-insumo-linha">
          <table className="data-table">
            <colgroup>
              {linhas[0].cols.map((c) => (
                <col
                  key={c.key}
                  className={c.key === 'produto' ? undefined : `op-insumo-w--${c.key}`}
                />
              ))}
            </colgroup>
            <thead>
              <tr>
                {linhas[0].cols.map((c) => (
                  <th
                    key={c.key}
                    className={c.num ? 'num' : c.key === 'produto' ? 'op-insumo-produto' : undefined}
                    title={c.title}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.id}>
                  {linha.cols.map((c) => (
                    <td
                      key={c.key}
                      className={
                        c.num ? 'num' : c.key === 'produto' ? 'op-insumo-produto' : undefined
                      }
                    >
                      {typeof c.node === 'string' ? (
                        <span title={c.node}>{c.node}</span>
                      ) : (
                        c.node
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : temPassa ? (
        <p className="form-hint" style={{ marginTop: 0 }}>
          {hidratando
            ? 'Calculando bobinas de retorno…'
            : 'Passa detectado — atualize a ordem se as bobinas não aparecerem.'}
        </p>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
        {bobinas.length > 0 && podeConfirmar ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy || !locaisOk || hidratando}
            onClick={() => void confirmar()}
          >
            Confirmar devolução
          </button>
        ) : null}
        {etiquetasIds.length > 0 ? (
          <Link
            className="btn btn-secondary btn-sm"
            to={`/estoque/lotes/etiquetas?${etiquetasIds.map((id) => `ids=${id}`).join('&')}`}
          >
            Imprimir etiquetas
          </Link>
        ) : null}
        {!podeConfirmar && bobinas.length > 0 ? (
          <Link className="btn btn-secondary btn-sm" to={`/estoque/a-buscar?op=${op.id}`}>
            Devolver no estoque
          </Link>
        ) : null}
      </div>
    </div>
  );
}
