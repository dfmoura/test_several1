package com.trigger.atualizaparceiros;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.StringUtils;

import java.math.BigDecimal;

/**
 * Botão de ação para atualizar a tabela AD_LATLONGPARC com base nos parceiros da view VGF_VENDAS_SATIS
 * Adiciona novos parceiros que não existem na tabela e atualiza registros existentes quando os campos
 * CIDADE ou ESTADO foram modificados, incluindo informações de cidade, estado e país
 */
public class AtualizaParcBT2 implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("com.trigger.atualizaparceiros.AtualizaParcBT1 - INICIO");

        // Capturar nufin da tela atual (baseado no ImportarBT.java)
        BigDecimal nufin = null;
        Registro[] linhas = contexto.getLinhas();
        
        if (linhas != null && linhas.length > 0) {
            // Obter o primeiro registro selecionado
            Registro registroSelecionado = linhas[0];
            Object nufinObj = registroSelecionado.getCampo("NUFIN");
            
            if (nufinObj != null) {
                if (nufinObj instanceof BigDecimal) {
                    nufin = (BigDecimal) nufinObj;
                } else if (nufinObj instanceof Number) {
                    nufin = BigDecimal.valueOf(((Number) nufinObj).doubleValue());
                }
            }
        }
        
        // Se não encontrou nas linhas, tentar obter como parâmetro
        if (nufin == null) {
            Object nufinParam = contexto.getParam("NUFIN");
            if (nufinParam != null) {
                if (nufinParam instanceof BigDecimal) {
                    nufin = (BigDecimal) nufinParam;
                } else if (nufinParam instanceof Number) {
                    nufin = BigDecimal.valueOf(((Number) nufinParam).doubleValue());
                }
            }
        }
        
        System.out.println("NUFIN capturado da tela: " + (nufin != null ? nufin.toString() : "não encontrado"));

        QueryExecutor query = contexto.getQuery();
        int totalInseridos = 0;
        int totalAtualizados = 0;
        int totalVerificados = 0;

        try {
            // Buscar todos os parceiros distintos da view VGF_VENDAS_SATIS com dados de localização
            query.nativeSelect(
                    "SELECT DISTINCT " +
                            "par.CODPARC, " +
                            "cid.nomecid as CIDADE, " +
                            "ufs.DESCRICAO as ESTADO, " +
                            "'BRASIL' as PAIS " +
                            "FROM tgfpar par " +
                            "INNER JOIN tsiend endi ON par.codend = endi.codend " +
                            "INNER JOIN tsibai bai ON par.codbai = bai.codbai " +
                            "INNER JOIN tsicid cid ON par.codcid = cid.codcid " +
                            "INNER JOIN tsiufs ufs ON cid.UF = ufs.CODUF " +
                            "WHERE par.CODPARC IS NOT NULL " +
                            "ORDER BY 3,2"
            );
            
            while (query.next()) {
                totalVerificados++;
                String codParc = query.getString("CODPARC");
                
                if (StringUtils.isEmpty(codParc)) {
                    continue;
                }

                // Verificar se o parceiro já existe na tabela AD_LATLONGPARC e obter dados atuais
                QueryExecutor queryCheck = contexto.getQuery();
                try {
                    queryCheck.setParam("CODPARC", codParc);
                    queryCheck.nativeSelect("SELECT CODIGO, CIDADE, ESTADO FROM AD_LATLONGPARC WHERE CODPARC = {CODPARC}");
                    
                    boolean existeRegistro = false;
                    String cidadeAtual = null;
                    String estadoAtual = null;
                    int codigoRegistro = 0;
                    
                    if (queryCheck.next()) {
                        existeRegistro = true;
                        cidadeAtual = queryCheck.getString("CIDADE");
                        estadoAtual = queryCheck.getString("ESTADO");
                        codigoRegistro = queryCheck.getInt("CODIGO");
                    }
                    
                    // Obter dados da query principal
                    String cidadeNova = query.getString("CIDADE");
                    String estadoNovo = query.getString("ESTADO");
                    String pais = query.getString("PAIS");
                    
                    // Se não existe, inserir novo registro
                    if (!existeRegistro) {
                        // Obter próximo código sequencial
                        QueryExecutor querySeq = contexto.getQuery();
                        try {
                            querySeq.nativeSelect("SELECT NVL(MAX(CODIGO), 0) + 1 AS PROXIMO_CODIGO FROM AD_LATLONGPARC");
                            
                            int proximoCodigo = 1;
                            if (querySeq.next()) {
                                proximoCodigo = querySeq.getInt("PROXIMO_CODIGO");
                            }
                            
                            // Inserir novo registro com os campos adicionais
                            QueryExecutor queryInsert = contexto.getQuery();
                            try {
                                queryInsert.setParam("CODIGO", proximoCodigo);
                                queryInsert.setParam("CODPARC", codParc);
                                queryInsert.setParam("CIDADE", cidadeNova);
                                queryInsert.setParam("ESTADO", estadoNovo);
                                queryInsert.setParam("PAIS", pais);
                                
                                queryInsert.update("INSERT INTO AD_LATLONGPARC (CODIGO, CODPARC, CIDADE, ESTADO, PAIS) " +
                                        "VALUES ({CODIGO}, {CODPARC}, {CIDADE}, {ESTADO}, {PAIS})");
                                
                                totalInseridos++;
                                System.out.println("Parceiro inserido - CODIGO: " + proximoCodigo + 
                                        ", CODPARC: " + codParc + 
                                        ", CIDADE: " + cidadeNova + 
                                        ", ESTADO: " + estadoNovo + 
                                        ", PAIS: " + pais);
                                
                            } finally {
                                queryInsert.close();
                            }
                            
                        } finally {
                            querySeq.close();
                        }
                    } else {
                        // Registro existe - verificar se precisa atualizar CIDADE ou ESTADO
                        boolean precisaAtualizar = false;
                        
                        // Verificar se CIDADE mudou (considerando valores nulos)
                        if ((cidadeAtual == null && cidadeNova != null) || 
                            (cidadeAtual != null && !cidadeAtual.equals(cidadeNova))) {
                            precisaAtualizar = true;
                        }
                        
                        // Verificar se ESTADO mudou (considerando valores nulos)
                        if ((estadoAtual == null && estadoNovo != null) || 
                            (estadoAtual != null && !estadoAtual.equals(estadoNovo))) {
                            precisaAtualizar = true;
                        }
                        
                        // Se precisa atualizar, executar UPDATE
                        if (precisaAtualizar) {
                            QueryExecutor queryUpdate = contexto.getQuery();
                            try {
                                queryUpdate.setParam("CODIGO", codigoRegistro);
                                queryUpdate.setParam("CIDADE", cidadeNova);
                                queryUpdate.setParam("ESTADO", estadoNovo);
                                queryUpdate.setParam("PAIS", pais);
                                
                                queryUpdate.update("UPDATE AD_LATLONGPARC SET " +
                                        "CIDADE = {CIDADE}, " +
                                        "ESTADO = {ESTADO}, " +
                                        "PAIS = {PAIS} " +
                                        "WHERE CODIGO = {CODIGO}");
                                
                                totalAtualizados++;
                                System.out.println("Parceiro atualizado - CODIGO: " + codigoRegistro + 
                                        ", CODPARC: " + codParc + 
                                        ", CIDADE: " + cidadeNova + 
                                        " (era: " + cidadeAtual + ")" +
                                        ", ESTADO: " + estadoNovo + 
                                        " (era: " + estadoAtual + ")");
                                
                            } finally {
                                queryUpdate.close();
                            }
                        }
                    }
                    
                } finally {
                    queryCheck.close();
                }
            }

            // Preparar mensagem de retorno
            StringBuilder mensagemRetorno = new StringBuilder();
            mensagemRetorno.append("Atualização de parceiros concluída com sucesso!\n\n");
            
            // Mostrar nufin capturado da tela atual
            if (nufin != null) {
                mensagemRetorno.append("NUFIN da tela atual: ").append(nufin.toString()).append("\n\n");
            }
            
            mensagemRetorno.append("Resumo da operação:\n");
            mensagemRetorno.append("• Total de parceiros verificados: ").append(totalVerificados).append("\n");
            mensagemRetorno.append("• Novos parceiros inseridos: ").append(totalInseridos).append("\n");
            mensagemRetorno.append("• Parceiros atualizados: ").append(totalAtualizados).append("\n");
            mensagemRetorno.append("• Parceiros sem alterações: ").append(totalVerificados - totalInseridos - totalAtualizados);
            
            if (totalInseridos > 0 || totalAtualizados > 0) {
                mensagemRetorno.append("\n\nOperações realizadas com sucesso:");
                if (totalInseridos > 0) {
                    mensagemRetorno.append("\n• ").append(totalInseridos).append(" novos parceiros foram adicionados à tabela AD_LATLONGPARC");
                }
                if (totalAtualizados > 0) {
                    mensagemRetorno.append("\n• ").append(totalAtualizados).append(" parceiros tiveram seus dados de CIDADE/ESTADO atualizados");
                }
            } else {
                mensagemRetorno.append("\n\nNenhuma alteração foi necessária. Todos os parceiros já estão atualizados na tabela.");
            }

            contexto.setMensagemRetorno(mensagemRetorno.toString());
            System.out.println("Atualização concluída - Verificados: " + totalVerificados + 
                    ", Inseridos: " + totalInseridos + 
                    ", Atualizados: " + totalAtualizados);

        } catch (Exception e) {
            String mensagemErro = "Erro ao atualizar parceiros: " + e.getMessage();
            contexto.mostraErro(mensagemErro);
            System.out.println("Erro na atualização de parceiros: " + e.getMessage());
            throw e;
        } finally {
            // Garantir fechamento do QueryExecutor
            query.close();
        }

        System.out.println("com.trigger.atualizaparceiros.AtualizaParcBT1 - FIM");
    }
}
