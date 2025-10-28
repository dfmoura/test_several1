# Guia Completo: Como Iniciar Produção na Tela 'Operações de Produção' ERP Sankhya via API

## 📋 Visão Geral

Este guia fornece um passo a passo detalhado para iniciar uma produção na tela "Operações de Produção" do ERP Sankhya através de uma API REST, baseado na análise do log `Monitor_Consulta.log` com `idiproc = 235` e na documentação oficial da Sankhya.

## 🔑 1. Autenticação na API Sankhya

### 1.1 Credenciais Necessárias
- **AppKey**: Chave de aplicação fornecida pela Sankhya
- **Token Bearer**: Token de autenticação OAuth 2.0
- **Username**: Nome de usuário do sistema
- **Password**: Senha do usuário

### 1.2 Processo de Autenticação
```http
POST https://api.sankhya.com.br/auth/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=password&
username=SEU_USUARIO&
password=SUA_SENHA&
client_id=SEU_CLIENT_ID&
client_secret=SEU_CLIENT_SECRET
```

### 1.3 Resposta de Autenticação
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## 📊 2. Consultar Atividades Pendentes

### 2.1 Endpoint para Listar Atividades
```http
POST https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=OperacaoProducaoSP.getAtividades
Authorization: Bearer SEU_TOKEN
Content-Type: application/json
```

### 2.2 Payload da Requisição
```json
{
  "serviceRequest": {
    "serviceName": "OperacaoProducaoSP.getAtividades",
    "requestBody": {
      "params": {
        "CODWCP": 4
      }
    }
  }
}
```

### 2.3 Resposta Esperada
```json
{
  "listaAtividades": [{
    "CODEXEC": 0,
    "CODWCP": 4,
    "DHACEITE": "2015-10-20 18:40:38.0",
    "DHFINAL": "",
    "DHFINPREV": "",
    "DHINCLUSAO": "2015-10-20 18:39:55.0",
    "DHINICIO": "2015-10-20 18:40:38.0",
    "DHINIPREV": "",
    "IDEFX": 2036,
    "IDEXECWFLOW": "778516",
    "IDIATV": 2948,
    "IDIPROC": 2256,
    "TEMPOGASTOMIN": 0
  }]
}
```

## 🏭 3. Consultar Produtos Acabados (Opcional)

### 3.1 Endpoint para Produtos Acabados
```http
POST https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=OperacaoProducaoSP.getProdutosAcabados
Authorization: Bearer SEU_TOKEN
Content-Type: application/json
```

### 3.2 Payload da Requisição
```json
{
  "serviceRequest": {
    "serviceName": "OperacaoProducaoSP.getProdutosAcabados",
    "requestBody": {
      "params": {
        "IDIATV": 2948
      }
    }
  }
}
```

### 3.3 Resposta Esperada
```json
{
  "listaProdutosAcabados": [{
    "CODPRODPA": 8333,
    "CONCLUIDO": "N",
    "CONTROLEPA": " ",
    "DTFAB": "",
    "DTVAL": "",
    "IDIPROC": 2246,
    "NROLOTE": "aqw123",
    "QTDPRODUZIR": 1,
    "REFERENCIA": "MINBOLGU80",
    "CODVOL": "UN"
  }]
}
```

## 🚀 4. Iniciar a Atividade (Passo Principal)

### 4.1 Endpoint para Iniciar Atividade
```http
POST https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=OperacaoProducaoSP.iniciarInstanciaAtividades
Authorization: Bearer SEU_TOKEN
Content-Type: application/json
```

### 4.2 Payload da Requisição
```json
{
  "serviceRequest": {
    "serviceName": "OperacaoProducaoSP.iniciarInstanciaAtividades",
    "requestBody": {
      "instancias": {
        "instancia": {
          "ACEITA_WC_INDISPONIVEL": true,
          "IDIATV": 2948
        }
      }
    }
  }
}
```

### 4.3 Parâmetros Importantes
- **ACEITA_WC_INDISPONIVEL**: Sempre enviar `true` (ClientEvent não implementado)
- **IDIATV**: Código da instância de atividade obtido na consulta anterior


## 📊 6. Análise do Log Monitor_Consulta.log

Baseado na análise do log fornecido com `idiproc = 235`, foram identificados os seguintes pontos:

### 6.1 Serviços Utilizados
- **OperacaoProducaoSP.iniciarInstanciaAtividades**: Serviço principal para iniciar atividades
- Consultas SQL relacionadas à tabela `TPRICCQ` com `IDIPROC = 235`

### 6.2 Estrutura do Processo
1. **Consulta de atividades**: Busca atividades pendentes no centro de trabalho
2. **Validação de produtos**: Verifica produtos acabados da OP
3. **Inicialização**: Executa o serviço `iniciarInstanciaAtividades`
4. **Monitoramento**: Registra logs de execução

## ⚠️ 7. Considerações Importantes

### 7.1 Permissões Necessárias
- Usuário deve ter permissão para operações de produção
- Centro de trabalho deve estar ativo e configurado
- Ordem de produção deve estar no status adequado

### 7.2 Validações
- Verificar se a atividade está no status correto para inicialização
- Confirmar disponibilidade do centro de trabalho
- Validar parâmetros obrigatórios antes do envio

### 7.3 Tratamento de Erros
- Implementar retry automático para falhas temporárias
- Logs detalhados para troubleshooting
- Validação de resposta da API

## 🔧 8. Troubleshooting

### 8.1 Erros Comuns
- **401 Unauthorized**: Verificar token de autenticação
- **400 Bad Request**: Validar payload da requisição
- **500 Internal Server Error**: Verificar configurações do ERP

### 8.2 Logs de Monitoramento
- Monitorar tabelas `TPRICCQ` e `TPRIATV`
- Verificar status das atividades após inicialização
- Acompanhar execução do workflow

## 📚 9. Recursos Adicionais

- [Documentação Oficial Sankhya API](https://developer.sankhya.com.br/)
- [Referência POST Salve](https://developer.sankhya.com.br/reference/post_salve)
- Logs de monitoramento em `Monitor_Consulta.log`

## 🎯 10. Próximos Passos

Após iniciar a produção, você pode:
1. **Apontar produção**: Registrar quantidades produzidas
2. **Monitorar progresso**: Acompanhar status da atividade
3. **Finalizar atividade**: Concluir o processo de produção
4. **Gerar relatórios**: Extrair dados de produção

---

**Nota**: Este guia foi baseado na análise do log `Monitor_Consulta.log` com `idiproc = 235` e na documentação oficial da Sankhya. Sempre teste em ambiente de desenvolvimento antes de usar em produção.
