import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, type OrdemProducao, type OrdemProducaoMaterial } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { parseQtdeDigitada } from '../lib/producaoUi';
import { rotuloLocal, type LocalSaldo } from './LocalSaldoCampo';

function qtdeCanon(n: number): string {
  return n.toFixed(4);
}

type BobinaRetorno = {
  chave: string;
  lote_pai_id: number;
  tipo: string;
  largura_mm: string;
  comprimento_m: string;
  area_m2: string;
  qtde: string;
  status: string;
  lote_id?: number | null;
};

type Props = {
  op: OrdemProducao;
  material: OrdemProducaoMaterial;
  podeEstoque: boolean;
  canWrite: boolean;
  busy: boolean;
  onBusy: (v: boolean) => void;
  onOp: (data: OrdemProducao) => void;
  onErr: (msg: string | null) => void;
};

function bobinasPendentes(m: OrdemProducaoMaterial): BobinaRetorno[] {
  const out: BobinaRetorno[] = [];
  for (const p of m.partida_prevista ?? []) {
    if (p.status !== 'pendente') continue;
    const lista = p.bobinas?.length
      ? p.bobinas
      : [
          ...(p.refile
            ? [
                {
                  chave: `${p.lote_pai_id}-refile`,
                  lote_pai_id: p.lote_pai_id,
                  tipo: 'refile',
                  largura_mm: String(p.refile.largura_mm ?? ''),
                  comprimento_m: String(p.refile.comprimento_m ?? ''),
                  area_m2: String(p.refile.area_m2 ?? p.refile.qtde ?? ''),
                  qtde: String(p.refile.qtde ?? ''),
                  status: p.status,
                },
              ]
            : []),
          ...(p.sobra
            ? [
                {
                  chave: `${p.lote_pai_id}-sobra`,
                  lote_pai_id: p.lote_pai_id,
                  tipo: 'sobra',
                  largura_mm: String(p.sobra.largura_mm ?? ''),
                  comprimento_m: String(p.sobra.comprimento_m ?? ''),
                  area_m2: String(p.sobra.area_m2 ?? p.sobra.qtde ?? ''),
                  qtde: String(p.sobra.qtde ?? ''),
                  status: p.status,
                },
              ]
            : []),
        ];
    for (const b of lista) {
      if (parseQtdeDigitada(b.qtde) <= 0) continue;
      out.push(b as BobinaRetorno);
    }
  }
  return out;
}

function rotuloTipo(tipo: string): string {
  return tipo === 'refile' ? 'Refile' : 'Sobra (Passa)';
}

/**
 * Grade no Papel/Acabamento: 1 bobina por largura × metro linear,
 * com local e confirmação → ENTRADA_SOBRA (volumes novos) + etiquetas.
 */
export function OpRetornoBobinas({
  op,
  material,
  podeEstoque,
  canWrite,
  busy,
  onBusy,
  onOp,
  onErr,
}: Props) {
  const bobinas = useMemo(() => bobinasPendentes(material), [material]);
  const [locais, setLocais] = useState<LocalSaldo[]>([]);
  const [escolha, setEscolha] = useState<Record<string, string>>({});
  const [etiquetasIds, setEtiquetasIds] = useState<number[]>([]);

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
  }, [material.id]);

  if (bobinas.length === 0 && etiquetasIds.length === 0) {
    return null;
  }

  const podeConfirmar = podeEstoque && canWrite;
  const locaisOk =
    bobinas.length > 0 && bobinas.every((b) => Number(escolha[b.chave] ?? 0) > 0);

  const confirmar = async () => {
    if (!podeConfirmar || busy) return;
    if (!locaisOk) {
      onErr('Informe o local de cada bobina antes de devolver.');
      return;
    }
    onBusy(true);
    onErr(null);
    try {
      const porPai = new Map<number, number>();
      for (const b of bobinas) {
        const area = parseQtdeDigitada(b.qtde);
        porPai.set(b.lote_pai_id, (porPai.get(b.lote_pai_id) ?? 0) + area);
      }
      const volumes = [...porPai.entries()].map(([lote_id, qtde]) => ({
        lote_id,
        qtde: qtdeCanon(qtde),
      }));
      const locaisPayload = bobinas.map((b) => ({
        lote_pai_id: b.lote_pai_id,
        tipo: b.tipo,
        endereco_id: Number(escolha[b.chave]),
      }));
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

  return (
    <div className="orc-faixas-bloco" style={{ marginTop: '0.5rem' }}>
      <p className="form-hint" style={{ marginTop: 0, marginBottom: '0.4rem' }}>
        <strong>Bobinas a devolver</strong> — 1 bobina por largura × metro linear (mesmo SKU).
        Informe o local, confirme e imprima a etiqueta.
      </p>

      {bobinas.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Largura</th>
                <th>Metro linear</th>
                <th>m²</th>
                <th>Local</th>
              </tr>
            </thead>
            <tbody>
              {bobinas.map((b) => (
                <tr key={b.chave}>
                  <td>{rotuloTipo(b.tipo)}</td>
                  <td>
                    {formatDecimalBr(b.largura_mm, 1, { stripTrailingZeros: true })} mm
                  </td>
                  <td>
                    {formatDecimalBr(b.comprimento_m, 1, { stripTrailingZeros: true })} m
                  </td>
                  <td>
                    {formatDecimalBr(b.area_m2 || b.qtde, 2, { stripTrailingZeros: true })}
                  </td>
                  <td>
                    <select
                      aria-label={`Local da bobina ${rotuloTipo(b.tipo)}`}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
        {bobinas.length > 0 && podeConfirmar ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy || !locaisOk}
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
