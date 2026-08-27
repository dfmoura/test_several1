# Homologação SEFAZ-MG — go-live do emitente

Checklist alinhado ao estudo de viabilidade.

## Do cliente (emitente)

- [ ] IE MG ativa
- [ ] Credenciamento NF-e **homologação** no [SIARE](https://www2.fazenda.mg.gov.br/sol/)
  - Documentos Eletrônicos → Credenciar Emissor → NF-e
  - Aplicativo: “Desenvolvido por terceiros”
  - Nome do aplicativo: NF-e MG (softhouse)
- [ ] A1 e-CNPJ com CNPJ compatível com o estabelecimento emitente

## No sistema

- [ ] Cadastro do emitente (CNPJ, IE, CRT, endereço fiscal, série)
- [ ] Upload A1 + senha (vault)
- [ ] StatusServico = 107 (serviço em operação)
- [ ] `tpAmb=2` em todas as chamadas
- [ ] URLs `hnfe.fazenda.mg.gov.br`
- [ ] Primeira NF-e autorizada (cStat 100)
- [ ] `procNFe` armazenado e DANFE conferido
- [ ] Cancelamento de teste (evento 110111)

## Produção

Só depois da homologação. O cliente solicita produção no SIARE (prazo típico: até 12h do próximo dia útil). No sistema: flip de ambiente do emitente + validação de série. Mesmo código, `tpAmb=1`, prefixo `nfe.` em vez de `hnfe.`.
