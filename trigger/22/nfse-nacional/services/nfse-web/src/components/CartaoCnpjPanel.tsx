import { formatCnpj, formatTelefoneDisplay } from '@/lib/api';
import type { CartaoCnpjData } from '@/types';

function formatCep(cep: string) {
  const d = cep.replace(/\D/g, '');
  if (d.length !== 8) return cep;
  return d.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

function formatEndereco(end: NonNullable<CartaoCnpjData['endereco']>) {
  const parts = [
    end.logradouro,
    end.numero !== 'S/N' ? end.numero : undefined,
    end.complemento,
    end.bairro,
  ].filter(Boolean);
  return parts.join(', ');
}

function situacaoClass(situacao?: string) {
  if (!situacao) return 'text-slate-600';
  const lower = situacao.toLowerCase();
  if (lower.includes('ativa')) return 'text-emerald-700';
  if (lower.includes('baixada') || lower.includes('inapta') || lower.includes('nula')) {
    return 'text-red-700';
  }
  return 'text-amber-700';
}

interface CartaoCnpjPanelProps {
  dados: CartaoCnpjData;
  /** Inscrição municipal (cadastro municipal — não vem do cartão CNPJ). */
  inscricaoMunicipal?: string;
  /** Exibe linha de IM mesmo vazia (emitente/tomador). */
  showInscricaoMunicipal?: boolean;
  titulo?: string;
  /** Rótulo da fonte dos dados (ex.: "Brasil API + Receita WS"). */
  fonteLabel?: string;
}

export function CartaoCnpjPanel({
  dados,
  inscricaoMunicipal,
  showInscricaoMunicipal = false,
  titulo = 'Cartão CNPJ',
  fonteLabel,
}: CartaoCnpjPanelProps) {
  const end = dados.endereco;
  const fonte = fonteLabel ?? dados.fonte ?? 'Receita Federal';
  const municipioLabel = end?.nomeMunicipio
    ? `${end.nomeMunicipio}${end.uf ? ` — ${end.uf}` : ''} (IBGE ${end.codigoMunicipio})`
    : end?.codigoMunicipio
      ? `IBGE ${end.codigoMunicipio}${end.uf ? ` — ${end.uf}` : ''}`
      : '—';

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-800">{titulo}</h3>
        <span className="text-xs text-sky-600">Fonte: {fonte}</span>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">CNPJ</dt>
          <dd className="font-mono font-medium text-slate-900">{formatCnpj(dados.cnpj)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Situação cadastral</dt>
          <dd className={`font-medium ${situacaoClass(dados.situacaoCadastral)}`}>
            {dados.situacaoCadastral || '—'}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Razão social</dt>
          <dd className="font-medium text-slate-900">{dados.razaoSocial}</dd>
        </div>
        {dados.nomeFantasia && (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Nome fantasia</dt>
            <dd className="text-slate-900">{dados.nomeFantasia}</dd>
          </div>
        )}
        {dados.tipoEstabelecimento && (
          <div>
            <dt className="text-slate-500">Tipo</dt>
            <dd className="text-slate-900">{dados.tipoEstabelecimento}</dd>
          </div>
        )}
        {dados.porte && (
          <div>
            <dt className="text-slate-500">Porte</dt>
            <dd className="text-slate-900">{dados.porte}</dd>
          </div>
        )}
        {dados.dataAbertura && (
          <div>
            <dt className="text-slate-500">Abertura</dt>
            <dd className="text-slate-900">{dados.dataAbertura}</dd>
          </div>
        )}
        {dados.naturezaJuridica && (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Natureza jurídica</dt>
            <dd className="text-slate-900">{dados.naturezaJuridica}</dd>
          </div>
        )}
        {dados.optanteSimples !== undefined && (
          <div>
            <dt className="text-slate-500">Simples Nacional</dt>
            <dd className="text-slate-900">{dados.optanteSimples ? 'Optante' : 'Não optante'}</dd>
          </div>
        )}
        {dados.atividadePrincipal && (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Atividade principal</dt>
            <dd className="text-slate-900">
              {dados.atividadePrincipal.codigo} — {dados.atividadePrincipal.descricao}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-slate-500">E-mail</dt>
          <dd className="break-all text-slate-900">{dados.email || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Telefone</dt>
          <dd className="text-slate-900">
            {dados.telefone ? formatTelefoneDisplay(dados.telefone) : '—'}
          </dd>
        </div>
        {(showInscricaoMunicipal || inscricaoMunicipal) && (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Inscrição municipal</dt>
            <dd className="text-slate-900">{inscricaoMunicipal || '—'}</dd>
            {!inscricaoMunicipal && (
              <p className="mt-0.5 text-xs text-slate-500">
                Cadastro municipal — informe manualmente (.env do prestador ou campo do tomador na emissão).
              </p>
            )}
          </div>
        )}
        {end && (
          <>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Endereço</dt>
              <dd className="text-slate-900">{formatEndereco(end)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Município</dt>
              <dd className="text-slate-900">{municipioLabel}</dd>
            </div>
            <div>
              <dt className="text-slate-500">CEP</dt>
              <dd className="font-mono text-slate-900">{end.cep ? formatCep(end.cep) : '—'}</dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}
