# Mapeamento ERP → Focus NFe / NFS-e Nacional

Referências oficiais:

- [NF-e API](https://doc.focusnfe.com.br/reference/nfe)
- [NFS-e Nacional API](https://doc.focusnfe.com.br/reference/nfse-nacional)
- [Campos NF-e 4.00](https://campos.focusnfe.com.br/nfe/NotaFiscalXML.html)
- [Campos DPS / NFS-e Nacional](https://campos.focusnfe.com.br/nfse_nacional/EmissaoDPSXml.html)

## Fluxo

```
Cadastros (Empresa, Parceiro, Produto, Natureza, Série, ParametroFiscal)
  → resolveContextoFiscal
  → planejarDocumentosSaida (dual NF-e + NFS-e)
  → validatePreEmissao / checklist
  → toFocusNfePayload / toFocusNfseNacionalPayload
  → @reta/focus-nfe (simular | POST)
  → DocumentoFiscalSaida.requestJson / responseJson
```

`_meta` nunca vai no HTTP; fica só na cópia persistida.

## Cadastro → campo Focus

### Empresa (emitente / prestador)

| ERP | Focus NF-e | Focus NFS-e Nacional |
|---|---|---|
| `cnpj` | `cnpj_emitente` | `cnpj_prestador` |
| `inscricaoMunicipal` | — | `inscricao_municipal_prestador` |
| `codigoMunicipioIbge` | (emitente Focus) | `codigo_municipio_emissora` / `codigo_municipio_prestacao` |
| `ParametroFiscal.opSimpNac` | — | `codigo_opcao_simples_nacional` |
| `ParametroFiscal.regApTribSN` | — | `regime_apuracao_tributos_sn` |
| `ParametroFiscal.regEspTrib` | — | `regime_especial_tributacao` |
| `ParametroFiscal.pTotTribSN` | — | `percentual_total_tributos_simples_nacional` |

### Parceiro (destinatário / tomador)

| ERP | Focus NF-e | Focus NFS-e Nacional |
|---|---|---|
| `documento` (14) | `cnpj_destinatario` | `cnpj_tomador` |
| `documento` (11) | `cpf_destinatario` | `cpf_tomador` |
| `nome` / `razaoSocial` | `nome_destinatario` | `nome_tomador` |
| `emailFiscal` \| `email` | `email_destinatario` | `email_tomador` |
| `inscricaoEstadual` | `inscricao_estadual_destinatario` | — |
| `indicadorIeDest` | `indicador_inscricao_estadual_destinatario` (1/2/9) | — |
| `consumidorFinal` | `consumidor_final` | — |
| `inscricaoMunicipal` | — | `inscricao_municipal_tomador` |
| endereço | `*_destinatario` | `*_tomador` |
| `codigoMunicipioIbge` | `codigo_municipio_destinatario` | `codigo_municipio_tomador` |

### Produto / item

| ERP | Focus NF-e item | Focus NFS-e |
|---|---|---|
| `codigo` | `codigo_produto` | — |
| `descricao` / `descricaoFiscal` | `descricao` | (via discriminação) |
| `ncm` | `codigo_ncm` | — |
| `cest` | `codigo_cest` | — |
| `ean` | `codigo_barras_comercial` | — |
| `cfop` / Natureza CFOP | `cfop` | — |
| `csosn` | `icms_situacao_tributaria` | — |
| `cstPis` / `cstCofins` | `pis_situacao_tributaria` / `cofins_*` | — |
| `cTribNac` | — | `codigo_tributacao_nacional_iss` |
| `cNbs` | — | `codigo_nbs` |
| `tributacaoIss` | — | `tributacao_iss` |
| `issRetido` | — | `iss_retido` |
| `ibsCbsSituacaoTributaria` | `ibs_cbs_situacao_tributaria` | idem |
| `ibsCbsClassificacaoTributaria` | `ibs_cbs_classificacao_tributaria` | idem (`cClassTrib`) |

### Natureza / série

| ERP | Focus |
|---|---|
| `NaturezaOperacao.descricao` | `natureza_operacao` |
| `NaturezaOperacao.finalidadeEmissao` | `finalidade_emissao` |
| `SerieDocumentoFiscal` NFE | `serie`, `numero` |
| `SerieDocumentoFiscal` NFSE_DPS | `serie_dps`, `numero_dps` |

## Operações `@reta/focus-nfe`

| Função | Endpoint Focus |
|---|---|
| `emitirNfe` | `POST /v2/nfe?ref=` |
| `consultarNfe` | `GET /v2/nfe/{ref}` |
| `cancelarNfe` | `DELETE /v2/nfe/{ref}` |
| `emitirCartaCorrecaoNfe` | `POST /v2/nfe/{ref}/carta_correcao` |
| `enviarNfeEmail` | `POST /v2/nfe/{ref}/email` |
| `inutilizarNumeracaoNfe` | `POST /v2/nfe/inutilizacao` |
| `reenviarHookNfe` | `POST /v2/nfe/{ref}/hook` |
| `emitirNfseNacional` | `POST /v2/nfsen?ref=` |
| `consultarNfseNacional` | `GET /v2/nfsen/{ref}` |
| `cancelarNfseNacional` | `DELETE /v2/nfsen/{ref}` |
| `reenviarHookNfseNacional` | `POST /v2/nfsen/{ref}/hook` |

Homologação: `simularProducao` / `EmpresaIntegracao.modo=SIMULADO` / sem token → não faz HTTP.
