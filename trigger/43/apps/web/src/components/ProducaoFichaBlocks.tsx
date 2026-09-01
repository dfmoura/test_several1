import type { ReactNode } from 'react';
import {
  facaDesenhoFromSnapshot,
  OrcamentoFacaDesenho,
} from './OrcamentoFacaDesenho';
import { formatoLabel } from './FacaShapeIcon';
import { ModelosComposicaoTable } from './ModelosComposicaoTable';
import type { OrcamentoFaixaResult } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { displaySnap, type ModeloComposicaoForm } from '../lib/orcamentoForm';
import {
  buildGuiaProducaoLinhas,
  especFromSnapshot,
  GUIA_PRODUCAO_GRUPO_LABEL,
} from '../lib/orcamentoGuiaProducao';
import { dash } from '../lib/producaoFicha';

type KvProps = { label: string; value: ReactNode; wide?: boolean };

export function FichaKv({ label, value, wide }: KvProps) {
  return (
    <div className={`ficha-kv${wide ? ' ficha-kv-wide' : ''}`}>
      <span className="ficha-kv-label">{label}</span>
      <span className="ficha-kv-value">{value}</span>
    </div>
  );
}

export function FichaSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ficha-section">
      <h3>{title}</h3>
      <div className="ficha-section-body">{children}</div>
    </section>
  );
}

function cmBr(value: unknown, digits = 2): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return dash(value as string);
  return `${formatDecimalBr(n, digits)} cm`;
}

function snap(input: Record<string, unknown>, key: string): string {
  return displaySnap(input[key]);
}

/** Especificação operacional — sem imposto, preço ou margem. */
export function FichaEspecificacaoSection({ spec }: { spec: Record<string, unknown> }) {
  const keys = [
    'medida',
    'papel',
    'cores',
    'acabamento',
    'tubete',
    'maquina',
    'largura_cm',
    'puxada_cm',
    'etiq_por_rolo',
    'colunas',
    'z',
    'formato_faca',
  ];
  const hasAny = keys.some((k) => {
    const v = spec[k];
    return v != null && String(v).trim() !== '';
  });
  if (!hasAny) {
    return (
      <FichaSection title="Especificação">
        <p className="ficha-empty">Sem especificação no snapshot deste pedido.</p>
      </FichaSection>
    );
  }

  const formato = spec.formato_faca != null ? String(spec.formato_faca) : '';
  const facaNova = Boolean(spec.faca_nova);

  return (
    <FichaSection title="Especificação (snapshot travado)">
      <div className="ficha-kv-grid cols-4">
        <FichaKv label="Medida" value={snap(spec, 'medida')} />
        <FichaKv label="Largura papel" value={cmBr(spec.largura_cm)} />
        <FichaKv label="Puxada" value={cmBr(spec.puxada_cm, 4)} />
        <FichaKv label="Cores" value={snap(spec, 'cores')} />
        <FichaKv label="Papel / filme" value={snap(spec, 'papel')} wide />
        <FichaKv label="Acabamento" value={snap(spec, 'acabamento')} />
        <FichaKv label="Tubete" value={snap(spec, 'tubete')} />
        <FichaKv label="Etiq./rolo" value={snap(spec, 'etiq_por_rolo')} />
        <FichaKv label="Máquina" value={snap(spec, 'maquina')} />
        <FichaKv label="Z" value={snap(spec, 'z')} />
        <FichaKv
          label="Formato / faca"
          value={`${formato ? formatoLabel(formato) : '—'}${facaNova ? ' · FACA NOVA' : ''}`}
        />
        <FichaKv label="Colunas" value={snap(spec, 'colunas')} />
        <FichaKv label="Col. rebobinação" value={snap(spec, 'coluna_rebobinacao')} />
        <FichaKv label="Troca de produto" value={snap(spec, 'tipo_troca_produto')} />
        <FichaKv label="RPM" value={snap(spec, 'rpm')} />
        <FichaKv label="Modelos" value={snap(spec, 'modelos')} />
      </div>
    </FichaSection>
  );
}

/** Silhueta da faca — chão de fábrica; sem valor cotado. */
export function FichaFacaSection({ spec }: { spec: Record<string, unknown> }) {
  const faca = facaDesenhoFromSnapshot(spec);
  const formato = faca?.formato || (spec.formato_faca != null ? String(spec.formato_faca) : '');
  if (!faca && !formato) return null;

  return (
    <FichaSection title="Faca">
      <div className="ficha-orc-faca ficha-orc-faca-standalone">
        <OrcamentoFacaDesenho
          {...(faca ?? { formato, facaNova: Boolean(spec.faca_nova) })}
          variant="documento"
          audience="interno"
        />
      </div>
    </FichaSection>
  );
}

export function FichaGuiaProducaoSection({
  spec,
  faixa,
  modelos,
}: {
  spec: Record<string, unknown>;
  faixa: OrcamentoFaixaResult | null;
  modelos: ModeloComposicaoForm[];
}) {
  const linhas = buildGuiaProducaoLinhas(especFromSnapshot(spec), faixa, modelos);
  if (linhas.length === 0) return null;

  return (
    <FichaSection title="Guia de produção">
      <table className="ficha-table">
        <thead>
          <tr>
            <th>Grupo</th>
            <th>Item</th>
            <th>Especificação</th>
            <th>Qtde / unidade</th>
            <th>Nota</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((ln, i) => (
            <tr key={`${ln.grupo}-${ln.item}-${i}`}>
              <td>{GUIA_PRODUCAO_GRUPO_LABEL[ln.grupo]}</td>
              <td>
                <strong>{ln.item}</strong>
              </td>
              <td>{ln.especificacao}</td>
              <td>{ln.quantidade}</td>
              <td>{ln.nota ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {modelos.length > 0 && faixa ? (
        <ModelosComposicaoTable
          variant="ficha"
          title={null}
          hint={null}
          className="orc-modelos-ficha"
          modelos={modelos}
          faixas={[{ key: 0, quantidade: Number(faixa.quantidade) || 0 }]}
        />
      ) : null}
    </FichaSection>
  );
}
