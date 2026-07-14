import { useEffect, useState } from 'react';
import {
  defaultOpSimpNac,
  isOptanteSimplesNacional,
  MODO_TOT_TRIB_OPTIONS,
  OP_SIMP_NAC_OPTIONS,
  REG_AP_TRIB_SN_OPTIONS,
  REGIME_ESPECIAL_TRIBUTACAO_OPTIONS,
  RETENCAO_ISSQN_OPTIONS,
  SUSPENSAO_EXIGIBILIDADE_OPTIONS,
  TIPO_IMUNIDADE_OPTIONS,
  TP_RET_PIS_COFINS_OPTIONS,
  TRIBUTACAO_ISSQN_OPTIONS,
} from '@nfse/domain';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CartaoCnpjPanel } from '@/components/CartaoCnpjPanel';
import { TributacaoNacionalField } from '@/components/TributacaoNacionalField';
import { NbsField } from '@/components/NbsField';
import { PageHeader } from '@/components/PageHeader';
import { useCnpjLookup } from '@/hooks/useCnpjLookup';
import { api } from '@/lib/api';
import type { CartaoCnpjData, SystemConfig } from '@/types';

type TomadorEnderecoForm = {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  codigoMunicipio: string;
  nomeMunicipio: string;
  uf: string;
  cep: string;
};

const emptyEndereco = (): TomadorEnderecoForm => ({
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  codigoMunicipio: '',
  nomeMunicipio: '',
  uf: '',
  cep: '',
});

const defaultForm = {
  tomadorTipo: 'PJ' as 'PF' | 'PJ',
  tomadorCpfCnpj: '51124668000181',
  tomadorRazaoSocial: '',
  tomadorEmail: '',
  tomadorTelefone: '',
  tomadorInscricaoMunicipal: '',
  tomadorEndereco: emptyEndereco(),
  opSimpNac: '3' as '1' | '2' | '3',
  regApTribSN: '1' as '1' | '2' | '3',
  codigoServico: '170202',
  codigoNbs: '118064000',
  descricao: 'Serviços de apoio administrativo',
  codigoMunicipio: '3170206',
  codigoTributacaoMunicipal: '',
  casoEspecialIssqn: 'nao' as 'nao' | 'sim',
  tributacaoIssqnEspecial: '2' as '2' | '3' | '4',
  tributacaoIssqn: '1',
  regimeEspecialTributacao: '0',
  retencaoIssqn: '1',
  tipoImunidade: '',
  suspensaoExigibilidade: '',
  numeroProcessoSuspensao: '',
  beneficioMunicipal: '',
  aliquotaIss: '',
  valorServico: '1500.00',
  valorRecebidoIntermediario: '',
  descontoIncondicionado: '',
  descontoCondicionado: '',
  modoTotTrib: 'aliquota_sn' as 'valores' | 'percentuais' | 'aliquota_sn',
  totTribValorFederal: '',
  totTribValorEstadual: '',
  totTribValorMunicipal: '',
  totTribPctFederal: '',
  totTribPctEstadual: '',
  totTribPctMunicipal: '',
  aliquotaSimplesNacional: '6.00',
  valorIr: '',
  valorRetCp: '',
  valorRetContribSociais: '',
  tpRetPisCofins: '',
  valorPis: '',
  valorCofins: '',
  discriminacao: '',
};

function prestadorToCartao(cfg: SystemConfig): CartaoCnpjData {
  return {
    cnpj: cfg.cnpj,
    razaoSocial: cfg.razaoSocial,
    nomeFantasia: cfg.nomeFantasia,
    situacaoCadastral: cfg.situacaoCadastral,
    email: cfg.email,
    telefone: cfg.telefone,
    endereco: cfg.endereco,
    porte: cfg.porte,
    naturezaJuridica: cfg.naturezaJuridica,
    dataAbertura: cfg.dataAbertura,
    tipoEstabelecimento: cfg.tipoEstabelecimento,
    optanteSimples: cfg.optanteSimples,
    atividadePrincipal: cfg.atividadePrincipal,
    fonte: cfg.fonteCadastro,
  };
}

/** Preenche tomador a partir do cartão CNPJ — inscrição municipal nunca é copiada (somente manual). */
function applyCartaoToTomador(
  prev: typeof defaultForm,
  dados: CartaoCnpjData,
  overwrite = false,
): typeof defaultForm {
  const end = dados.endereco;
  return {
    ...prev,
    tomadorInscricaoMunicipal: prev.tomadorInscricaoMunicipal,
    tomadorRazaoSocial: overwrite || !prev.tomadorRazaoSocial ? dados.razaoSocial : prev.tomadorRazaoSocial,
    tomadorEmail: overwrite || !prev.tomadorEmail ? (dados.email ?? '') : prev.tomadorEmail,
    tomadorTelefone: overwrite || !prev.tomadorTelefone ? (dados.telefone ?? '') : prev.tomadorTelefone,
    tomadorEndereco: end
      ? {
          logradouro: overwrite || !prev.tomadorEndereco.logradouro ? end.logradouro : prev.tomadorEndereco.logradouro,
          numero: overwrite || !prev.tomadorEndereco.numero ? end.numero : prev.tomadorEndereco.numero,
          complemento: overwrite || !prev.tomadorEndereco.complemento ? (end.complemento ?? '') : prev.tomadorEndereco.complemento,
          bairro: overwrite || !prev.tomadorEndereco.bairro ? end.bairro : prev.tomadorEndereco.bairro,
          codigoMunicipio: overwrite || !prev.tomadorEndereco.codigoMunicipio ? end.codigoMunicipio : prev.tomadorEndereco.codigoMunicipio,
          nomeMunicipio: overwrite || !prev.tomadorEndereco.nomeMunicipio ? (end.nomeMunicipio ?? '') : prev.tomadorEndereco.nomeMunicipio,
          uf: overwrite || !prev.tomadorEndereco.uf ? end.uf : prev.tomadorEndereco.uf,
          cep: overwrite || !prev.tomadorEndereco.cep ? end.cep : prev.tomadorEndereco.cep,
        }
      : prev.tomadorEndereco,
  };
}

export function Emitir() {
  const [form, setForm] = useState(defaultForm);
  const [prestador, setPrestador] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const substituirChave = searchParams.get('substituir');
  const navigate = useNavigate();
  const cnpjLookup = useCnpjLookup();

  useEffect(() => {
    api.config().then((cfg) => {
      setPrestador(cfg);
      setForm((f) => ({
        ...f,
        codigoMunicipio: cfg.codigoMunicipio || f.codigoMunicipio,
        opSimpNac: defaultOpSimpNac(cfg.optanteSimples),
        regApTribSN: cfg.optanteSimples ? f.regApTribSN : '1',
      }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.tomadorTipo !== 'PJ') {
      cnpjLookup.reset();
      return;
    }
    cnpjLookup.lookup(form.tomadorCpfCnpj);
  }, [form.tomadorCpfCnpj, form.tomadorTipo]);

  useEffect(() => {
    if (cnpjLookup.status !== 'found' || !cnpjLookup.dados) return;
    setForm((f) => applyCartaoToTomador(f, cnpjLookup.dados!, false));
  }, [cnpjLookup.status, cnpjLookup.dados]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setEndereco = (key: keyof TomadorEnderecoForm, value: string) =>
    setForm((f) => ({
      ...f,
      tomadorEndereco: { ...f.tomadorEndereco, [key]: value },
    }));

  const buildPayload = () => {
    const end = form.tomadorEndereco;
    const hasEndereco = end.logradouro && end.codigoMunicipio && end.cep;
    const tributacaoIssqn =
      form.casoEspecialIssqn === 'sim' ? form.tributacaoIssqnEspecial : '1';

    const totTrib =
      form.modoTotTrib === 'valores'
        ? {
            modo: 'valores' as const,
            valorFederal: parseFloat(form.totTribValorFederal),
            valorEstadual: parseFloat(form.totTribValorEstadual),
            valorMunicipal: parseFloat(form.totTribValorMunicipal),
          }
        : form.modoTotTrib === 'percentuais'
          ? {
              modo: 'percentuais' as const,
              percentualFederal: parseFloat(form.totTribPctFederal),
              percentualEstadual: parseFloat(form.totTribPctEstadual),
              percentualMunicipal: parseFloat(form.totTribPctMunicipal),
            }
          : {
              modo: 'aliquota_sn' as const,
              aliquotaSimplesNacional: parseFloat(form.aliquotaSimplesNacional),
            };

    return {
      tomador: {
        tipo: form.tomadorTipo,
        cpfCnpj: form.tomadorCpfCnpj.replace(/\D/g, ''),
        razaoSocial: form.tomadorRazaoSocial || undefined,
        email: form.tomadorEmail || undefined,
        telefone: form.tomadorTelefone || undefined,
        inscricaoMunicipal: form.tomadorInscricaoMunicipal || undefined,
        endereco: hasEndereco
          ? {
              logradouro: end.logradouro,
              numero: end.numero || 'S/N',
              complemento: end.complemento || undefined,
              bairro: end.bairro,
              codigoMunicipio: end.codigoMunicipio,
              uf: end.uf,
              cep: end.cep.replace(/\D/g, ''),
              nomeMunicipio: end.nomeMunicipio || undefined,
            }
          : undefined,
      },
      opSimpNac: form.opSimpNac,
      regApTribSN: isOptanteSimplesNacional(form.opSimpNac) ? form.regApTribSN : undefined,
      servico: {
        codigoServico: form.codigoServico,
        codigoNbs: form.codigoNbs || undefined,
        descricao: form.descricao,
        codigoMunicipioIncidencia: form.codigoMunicipio,
        codigoTributacaoMunicipal: form.codigoTributacaoMunicipal || undefined,
        codigoPaisPrestacao: '105',
        codigoPaisResultado: '105',
        aliquotaIss: form.aliquotaIss ? parseFloat(form.aliquotaIss) : undefined,
        tributacaoIssqn: tributacaoIssqn !== '1' ? tributacaoIssqn : undefined,
        tipoImunidade:
          tributacaoIssqn === '2' && form.tipoImunidade
            ? (form.tipoImunidade as '0' | '1' | '2' | '3' | '4' | '5')
            : undefined,
        suspensaoExigibilidade:
          form.suspensaoExigibilidade === '1' || form.suspensaoExigibilidade === '2'
            ? form.suspensaoExigibilidade
            : undefined,
        numeroProcessoSuspensao:
          form.suspensaoExigibilidade && form.numeroProcessoSuspensao
            ? form.numeroProcessoSuspensao
            : undefined,
        beneficioMunicipal: form.beneficioMunicipal || undefined,
        retencaoIssqn:
          form.retencaoIssqn === '2' || form.retencaoIssqn === '3'
            ? form.retencaoIssqn
            : undefined,
        tpRetPisCofins:
          form.tpRetPisCofins === '0' || form.tpRetPisCofins
            ? (form.tpRetPisCofins as '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9')
            : undefined,
      },
      regimeEspecialTributacao:
        form.regimeEspecialTributacao !== '0'
          ? (form.regimeEspecialTributacao as '1' | '2' | '3' | '4' | '5' | '6')
          : undefined,
      totTrib,
      valores: {
        valorServico: parseFloat(form.valorServico),
        valorRecebidoIntermediario: form.valorRecebidoIntermediario
          ? parseFloat(form.valorRecebidoIntermediario)
          : undefined,
        descontoIncondicionado: form.descontoIncondicionado
          ? parseFloat(form.descontoIncondicionado)
          : undefined,
        descontoCondicionado: form.descontoCondicionado
          ? parseFloat(form.descontoCondicionado)
          : undefined,
        valorIr: form.valorIr ? parseFloat(form.valorIr) : undefined,
        valorInss: form.valorRetCp ? parseFloat(form.valorRetCp) : undefined,
        valorCsll: form.valorRetContribSociais ? parseFloat(form.valorRetContribSociais) : undefined,
        valorPis: form.valorPis ? parseFloat(form.valorPis) : undefined,
        valorCofins: form.valorCofins ? parseFloat(form.valorCofins) : undefined,
      },
      discriminacao: form.discriminacao || undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const idempotencyKey = crypto.randomUUID();
    try {
      const payload = buildPayload();
      if (substituirChave) {
        const result = await api.substituir(substituirChave, payload, idempotencyKey) as { chaveAcesso: string };
        navigate(`/nfse/${result.chaveAcesso}`);
      } else {
        const result = await api.emitir(payload, idempotencyKey) as { chaveAcesso: string };
        navigate(`/nfse/${result.chaveAcesso}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na emissão');
    } finally {
      setLoading(false);
    }
  };

  const recarregarCartaoTomador = () => {
    if (form.tomadorTipo === 'PJ') {
      cnpjLookup.lookup(form.tomadorCpfCnpj, true);
    }
  };

  const tomadorCartao: CartaoCnpjData | null =
    cnpjLookup.status === 'found' && cnpjLookup.dados ? cnpjLookup.dados : null;

  return (
    <>
      <PageHeader
        title={substituirChave ? 'Substituir NFS-e' : 'Emitir NFS-e'}
        subtitle={substituirChave ? `Substituindo ${substituirChave}` : 'Nova declaração de prestação de serviço'}
      />

      <form onSubmit={handleSubmit} className="card w-full p-4 sm:p-6 xl:max-w-6xl">
        {prestador && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Prestador (emitente)
            </h2>
            <CartaoCnpjPanel
              titulo="Cartão CNPJ — Emitente"
              dados={prestadorToCartao(prestador)}
              inscricaoMunicipal={prestador.inscricaoMunicipal}
              showInscricaoMunicipal
            />
            <p className="mt-2 text-xs text-slate-500">
              Município emissor (IBGE):{' '}
              {prestador.nomeMunicipio
                ? `${prestador.nomeMunicipio} (${prestador.codigoMunicipio})`
                : prestador.codigoMunicipio}
              {prestador.certificadoAtivo ? ' · Certificado A1 ativo' : ''}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Situação perante o Simples Nacional (opSimpNac)</label>
                <select
                  className="input"
                  value={form.opSimpNac}
                  onChange={(e) => set('opSimpNac', e.target.value)}
                  required
                >
                  {OP_SIMP_NAC_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {isOptanteSimplesNacional(form.opSimpNac) && (
                <div>
                  <label className="label">Regime de Apuração dos Tributos no Simples Nacional</label>
                  <select
                    className="input"
                    value={form.regApTribSN}
                    onChange={(e) => set('regApTribSN', e.target.value)}
                    required
                  >
                    {REG_AP_TRIB_SN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Tomador</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Tipo</label>
              <select
                className="input"
                value={form.tomadorTipo}
                onChange={(e) => {
                  const tipo = e.target.value as 'PF' | 'PJ';
                  setForm((f) => ({
                    ...f,
                    tomadorTipo: tipo,
                    tomadorEndereco: tipo === 'PF' ? emptyEndereco() : f.tomadorEndereco,
                  }));
                }}
              >
                <option value="PJ">Pessoa Jurídica</option>
                <option value="PF">Pessoa Física</option>
              </select>
            </div>
            <div>
              <label className="label">CPF/CNPJ</label>
              <input
                className="input"
                value={form.tomadorCpfCnpj}
                onChange={(e) => set('tomadorCpfCnpj', e.target.value)}
                required
              />
              {form.tomadorTipo === 'PJ' && cnpjLookup.status === 'loading' && (
                <p className="mt-1 text-xs text-slate-500">Consultando cartão CNPJ…</p>
              )}
              {cnpjLookup.error && (
                <p className="mt-1 text-xs text-amber-700">{cnpjLookup.error}</p>
              )}
            </div>
          </div>

          {form.tomadorTipo === 'PJ' && tomadorCartao && (
            <div className="mt-4 space-y-3">
              <CartaoCnpjPanel
                titulo="Cartão CNPJ — Tomador"
                dados={tomadorCartao}
                inscricaoMunicipal={form.tomadorInscricaoMunicipal}
                showInscricaoMunicipal
              />
              <button
                type="button"
                className="text-xs text-sky-700 hover:underline"
                onClick={recarregarCartaoTomador}
              >
                Atualizar dados do cartão CNPJ
              </button>
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Razão social / Nome</label>
              <input
                className="input"
                value={form.tomadorRazaoSocial}
                onChange={(e) => set('tomadorRazaoSocial', e.target.value)}
              />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input"
                value={form.tomadorEmail}
                onChange={(e) => set('tomadorEmail', e.target.value)}
                placeholder={tomadorCartao?.email ? 'Preenchido pelo cartão CNPJ' : 'Informe manualmente'}
              />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input
                className="input"
                value={form.tomadorTelefone}
                onChange={(e) => set('tomadorTelefone', e.target.value)}
                placeholder={tomadorCartao?.telefone ? 'Preenchido pelo cartão CNPJ' : 'Informe manualmente'}
              />
            </div>
            {form.tomadorTipo === 'PJ' && (
              <div className="sm:col-span-2">
                <label className="label">Inscrição municipal (opcional)</label>
                <input
                  className="input"
                  value={form.tomadorInscricaoMunicipal}
                  onChange={(e) => set('tomadorInscricaoMunicipal', e.target.value)}
                  placeholder="Cadastro municipal — informe manualmente se exigido"
                />
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Serviço</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Código de Tributação Nacional (cTribNac)</label>
              <TributacaoNacionalField
                value={form.codigoServico}
                onChange={(codigo) => set('codigoServico', codigo)}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Base nacional LC 116 — busque por código ou descrição do serviço.
              </p>
            </div>
            <div>
              <label className="label">Código NBS (cNBS)</label>
              <NbsField
                value={form.codigoNbs}
                codigoTribNac={form.codigoServico}
                onChange={(codigo) => set('codigoNbs', codigo)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Nomenclatura Brasileira de Serviços (ANEXO_B) — sugestões conforme o cTribNac selecionado.
              </p>
            </div>
            <div>
              <label className="label">Local de prestação (IBGE)</label>
              <input className="input" value={form.codigoMunicipio} onChange={(e) => set('codigoMunicipio', e.target.value)} maxLength={7} required />
            </div>
            <div>
              <label className="label">Código tributação municipal (cTribMun)</label>
              <input
                className="input"
                value={form.codigoTributacaoMunicipal}
                onChange={(e) => set('codigoTributacaoMunicipal', e.target.value)}
                placeholder="Quando exigido pelo município"
              />
            </div>
            <div>
              <label className="label">País de prestação</label>
              <input className="input bg-slate-50" value="105 — Brasil" readOnly />
            </div>
            <div>
              <label className="label">País resultado da prestação</label>
              <input className="input bg-slate-50" value="105 — Brasil" readOnly />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descrição</label>
              <input className="input" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">
                O serviço prestado é um caso de: imunidade, exportação de serviço ou não incidência do ISSQN?
              </label>
              <div className="mt-2 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="casoEspecialIssqn"
                    checked={form.casoEspecialIssqn === 'nao'}
                    onChange={() => set('casoEspecialIssqn', 'nao')}
                  />
                  Não
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="casoEspecialIssqn"
                    checked={form.casoEspecialIssqn === 'sim'}
                    onChange={() => set('casoEspecialIssqn', 'sim')}
                  />
                  Sim
                </label>
              </div>
            </div>
            {form.casoEspecialIssqn === 'sim' && (
              <div className="sm:col-span-2">
                <label className="label">Tipo do caso especial</label>
                <select
                  className="input"
                  value={form.tributacaoIssqnEspecial}
                  onChange={(e) => set('tributacaoIssqnEspecial', e.target.value)}
                >
                  {TRIBUTACAO_ISSQN_OPTIONS.filter((opt) => opt.value !== '1').map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Valores do serviço prestado
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Valor do serviço prestado (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                value={form.valorServico}
                onChange={(e) => set('valorServico', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Valor recebido pelo intermediário (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.valorRecebidoIntermediario}
                onChange={(e) => set('valorRecebidoIntermediario', e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="label">Desconto incondicionado (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.descontoIncondicionado}
                onChange={(e) => set('descontoIncondicionado', e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="label">Desconto condicionado (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.descontoCondicionado}
                onChange={(e) => set('descontoCondicionado', e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Tributação Municipal</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Suspensão da Exigibilidade do ISSQN</label>
              <select
                className="input"
                value={form.suspensaoExigibilidade}
                onChange={(e) => set('suspensaoExigibilidade', e.target.value)}
              >
                {SUSPENSAO_EXIGIBILIDADE_OPTIONS.map((opt) => (
                  <option key={opt.value || 'nao'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Regime Especial de Tributação</label>
              <select
                className="input"
                value={form.regimeEspecialTributacao}
                onChange={(e) => set('regimeEspecialTributacao', e.target.value)}
              >
                {REGIME_ESPECIAL_TRIBUTACAO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Retenção do ISSQN</label>
              <select
                className="input"
                value={form.retencaoIssqn}
                onChange={(e) => set('retencaoIssqn', e.target.value)}
              >
                {RETENCAO_ISSQN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Há retenção do ISSQN pelo Tomador ou pelo Intermediário?
              </p>
            </div>
            {form.casoEspecialIssqn === 'sim' && form.tributacaoIssqnEspecial === '2' && (
              <div className="sm:col-span-2">
                <label className="label">Tipo de Imunidade</label>
                <select
                  className="input"
                  value={form.tipoImunidade}
                  onChange={(e) => set('tipoImunidade', e.target.value)}
                  required
                >
                  <option value="">Selecione…</option>
                  {TIPO_IMUNIDADE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
            {(form.suspensaoExigibilidade === '1' || form.suspensaoExigibilidade === '2') && (
              <div className="sm:col-span-2">
                <label className="label">Número Processo Suspensão</label>
                <input
                  className="input"
                  value={form.numeroProcessoSuspensao}
                  onChange={(e) => set('numeroProcessoSuspensao', e.target.value)}
                  placeholder="Número do processo judicial ou administrativo"
                />
              </div>
            )}
            <div>
              <label className="label">Benefício Municipal (nBM)</label>
              <input
                className="input"
                value={form.beneficioMunicipal}
                onChange={(e) => set('beneficioMunicipal', e.target.value)}
                placeholder="Código do benefício municipal, quando aplicável"
              />
            </div>
            <div>
              <label className="label">Alíquota ISS %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.aliquotaIss}
                onChange={(e) => set('aliquotaIss', e.target.value)}
                placeholder="Opcional — omitido quando em branco (ex.: Simples Nacional)"
              />
              <p className="mt-1 text-xs text-slate-500">
                Informe somente quando a alíquota deve constar na DPS. Em branco, o campo não é enviado no XML (padrão Emissor Nacional).
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Discriminação (opcional)</label>
              <textarea className="input min-h-[80px]" value={form.discriminacao} onChange={(e) => set('discriminacao', e.target.value)} />
              <p className="mt-1 text-xs text-slate-500">
                Informações complementares adicionais — exibidas no PDF somente quando preenchidas. Não repete a descrição do serviço.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Valor aproximado dos tributos
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Conforme Lei 12.741/2012 e layout NFS-e Nacional (totTrib). Escolha uma das formas de informação —
            mutuamente exclusivas no XML.
          </p>
          <div className="space-y-4">
            {MODO_TOT_TRIB_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="radio"
                  name="modoTotTrib"
                  className="mt-1"
                  checked={form.modoTotTrib === opt.value}
                  onChange={() => set('modoTotTrib', opt.value)}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">{opt.label}</span>
                </span>
              </label>
            ))}
          </div>
          {form.modoTotTrib === 'valores' && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="label">Federal (R$)</label>
                <input type="number" step="0.01" min="0" className="input" value={form.totTribValorFederal} onChange={(e) => set('totTribValorFederal', e.target.value)} required />
              </div>
              <div>
                <label className="label">Estadual (R$)</label>
                <input type="number" step="0.01" min="0" className="input" value={form.totTribValorEstadual} onChange={(e) => set('totTribValorEstadual', e.target.value)} required />
              </div>
              <div>
                <label className="label">Municipal (R$)</label>
                <input type="number" step="0.01" min="0" className="input" value={form.totTribValorMunicipal} onChange={(e) => set('totTribValorMunicipal', e.target.value)} required />
              </div>
            </div>
          )}
          {form.modoTotTrib === 'percentuais' && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="label">Federal (%)</label>
                <input type="number" step="0.01" min="0" className="input" value={form.totTribPctFederal} onChange={(e) => set('totTribPctFederal', e.target.value)} required />
              </div>
              <div>
                <label className="label">Estadual (%)</label>
                <input type="number" step="0.01" min="0" className="input" value={form.totTribPctEstadual} onChange={(e) => set('totTribPctEstadual', e.target.value)} required />
              </div>
              <div>
                <label className="label">Municipal (%)</label>
                <input type="number" step="0.01" min="0" className="input" value={form.totTribPctMunicipal} onChange={(e) => set('totTribPctMunicipal', e.target.value)} required />
              </div>
            </div>
          )}
          {form.modoTotTrib === 'aliquota_sn' && (
            <div className="mt-4 max-w-xs">
              <label className="label">Alíquota no Simples Nacional (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.aliquotaSimplesNacional}
                onChange={(e) => set('aliquotaSimplesNacional', e.target.value)}
                required
              />
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Tributação Federal</h2>
          <p className="mb-4 text-xs text-slate-500">
            Campos conforme layout DANFSe NT-007/008. Contribuições sociais retidas (PIS/COFINS/CSLL) devem ser
            informadas somadas em vRetCSLL; vPis e vCofins são exclusivos para débito de apuração própria.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">IRRF (vRetIRRF)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.valorIr}
                onChange={(e) => set('valorIr', e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="label">Contribuição Previdenciária - Retida (vRetCP)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.valorRetCp}
                onChange={(e) => set('valorRetCp', e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="label">Contribuições Sociais - Retidas (vRetCSLL)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.valorRetContribSociais}
                onChange={(e) => set('valorRetContribSociais', e.target.value)}
                placeholder="Soma PIS + COFINS + CSLL retidos"
              />
            </div>
            <div>
              <label className="label">Descrição Contrib. Sociais - Retidas (tpRetPisCofins)</label>
              <select
                className="input"
                value={form.tpRetPisCofins}
                onChange={(e) => set('tpRetPisCofins', e.target.value)}
              >
                <option value="">Não informar</option>
                {TP_RET_PIS_COFINS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">PIS - Débito Apuração Própria (vPis)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.valorPis}
                onChange={(e) => set('valorPis', e.target.value)}
                placeholder="Opcional — não usar para retenção"
              />
            </div>
            <div>
              <label className="label">COFINS - Débito Apuração Própria (vCofins)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.valorCofins}
                onChange={(e) => set('valorCofins', e.target.value)}
                placeholder="Opcional — não usar para retenção"
              />
            </div>
          </div>
        </section>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processando…' : substituirChave ? 'Substituir NFS-e' : 'Emitir NFS-e'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/nfse')}>Cancelar</button>
        </div>
      </form>
    </>
  );
}
