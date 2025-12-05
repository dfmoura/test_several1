package main.java.br.com.triggerint;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.BigDecimalUtil;
import com.sankhya.util.StringUtils;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Botão de ação para iniciar produção de uma instância de processo (TPRIPROC)
 * Inicia as atividades relacionadas (TPRIATV) do processo selecionado
 * 
 * Suporta execução via:
 * - Linha selecionada na tabela (comportamento padrão)
 * - Parâmetros remotos via SankhyaJX (JX.acionarBotao)
 * 
 * Parâmetros aceitos quando chamado remotamente:
 * - P_IDIPROC ou PARAMETRO_A: ID da instância de processo (obrigatório quando chamado remotamente)
 */
public class IniciarProducaoBT1 implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.IniciarProducaoBT1 - INICIO");

        BigDecimal idiproc = null;
        boolean chamadaRemota = false;

        // Tentar obter parâmetros quando chamado remotamente via SankhyaJX
        // O SankhyaJX pode enviar PARAMETRO_A que precisa ser mapeado para P_IDIPROC
        // Tentamos ambos os nomes para garantir compatibilidade
        Object paramIdiproc = contexto.getParam("P_IDIPROC");
        
        // Se não encontrou P_IDIPROC, tenta PARAMETRO_A (formato usado pelo SankhyaJX)
        if (paramIdiproc == null) {
            paramIdiproc = contexto.getParam("PARAMETRO_A");
            System.out.println("Tentando obter PARAMETRO_A como alternativa a P_IDIPROC");
        }
        
        if (paramIdiproc != null) {
            // Chamada remota via parâmetros
            chamadaRemota = true;
            System.out.println("Chamada remota detectada - Parâmetro IDIPROC recebido (P_IDIPROC ou PARAMETRO_A): " + paramIdiproc);
            
            // Converter parâmetro para BigDecimal
            if (paramIdiproc instanceof BigDecimal) {
                idiproc = (BigDecimal) paramIdiproc;
            } else if (paramIdiproc instanceof String) {
                String idiprocStr = (String) paramIdiproc;
                if (StringUtils.isEmpty(idiprocStr)) {
                    contexto.mostraErro("Parâmetro P_IDIPROC não pode ser vazio quando chamado remotamente.");
                    return;
                }
                idiproc = BigDecimalUtil.valueOf(idiprocStr);
            } else if (paramIdiproc instanceof Number) {
                idiproc = BigDecimal.valueOf(((Number) paramIdiproc).doubleValue());
            } else {
                contexto.mostraErro("Parâmetro P_IDIPROC possui formato inválido: " + paramIdiproc.getClass().getName());
                return;
            }
        } else {
            // Comportamento padrão: usar linha selecionada
            chamadaRemota = false;
            
            // Validar se há registro selecionado (apenas um)
            Registro[] linhas = contexto.getLinhas();
            if (linhas.length == 0) {
                contexto.mostraErro("Nenhum registro foi selecionado na tabela TPRIPROC e nenhum parâmetro P_IDIPROC ou PARAMETRO_A foi fornecido.");
                return;
            }

            if (linhas.length > 1) {
                contexto.mostraErro("Apenas um registro deve ser selecionado. Registros selecionados: " + linhas.length);
                return;
            }

            // Extrair IDIPROC do registro selecionado
            Registro registroSelecionado = linhas[0];
            Object idiprocObj = registroSelecionado.getCampo("IDIPROC");

            // Validar IDIPROC obrigatório
            if (idiprocObj == null) {
                contexto.mostraErro("Campo IDIPROC não encontrado ou vazio no registro selecionado.");
                return;
            }

            if (idiprocObj instanceof BigDecimal) {
                idiproc = (BigDecimal) idiprocObj;
            } else if (idiprocObj instanceof Number) {
                idiproc = BigDecimal.valueOf(((Number) idiprocObj).doubleValue());
            } else {
                contexto.mostraErro("Campo IDIPROC possui formato inválido.");
                return;
            }
        }

        // Obter usuário logado
        BigDecimal codUsu = contexto.getUsuarioLogado();
        if (codUsu == null) {
            contexto.mostraErro("Não foi possível identificar o usuário logado.");
            return;
        }

        // Obter data/hora atual
        Timestamp dataHoraAtual = new Timestamp(new Date().getTime());

        QueryExecutor query = contexto.getQuery();
        try {
            // Validar se o processo existe e obter informações
            query.setParam("IDIPROC", idiproc);
            query.nativeSelect("SELECT IDIPROC, STATUSPROC, NROLOTE FROM TPRIPROC WHERE IDIPROC = {IDIPROC}");

            if (!query.next()) {
                contexto.mostraErro("Processo não encontrado. IDIPROC: " + idiproc);
                return;
            }

            String statusProc = query.getString("STATUSPROC");
            String nrolote = query.getString("NROLOTE");

            // Validar status do processo (deve estar em estado válido para iniciar)
            // Status válidos: A (Aberto), R (Rascunho), P2 (Pendente), S (Iniciado), S2 (Em andamento)
            if (StringUtils.isEmpty(statusProc) || 
                (!statusProc.equals("A") && !statusProc.equals("R") && !statusProc.equals("P2") && 
                 !statusProc.equals("S") && !statusProc.equals("S2"))) {
                contexto.mostraErro("Processo não está em status válido para iniciar produção. Status atual: " + statusProc);
                return;
            }

            // Buscar atividades do processo que podem ser iniciadas
            query.close();
            query = contexto.getQuery();
            query.setParam("IDIPROC", idiproc);
            query.nativeSelect(
                "SELECT IDIATV, IDEFX, CODEXEC, CODUSU, DHACEITE, DHINICIO, CODULTEXEC " +
                "FROM TPRIATV " +
                "WHERE IDIPROC = {IDIPROC} " +
                "AND DHINICIO IS NULL " +
                "ORDER BY IDIATV"
            );

            // Coletar todas as atividades primeiro
            List<BigDecimal> listaIdiatv = new ArrayList<>();
            Map<BigDecimal, Timestamp> mapaDhaceite = new HashMap<>();
            
            while (query.next()) {
                BigDecimal idiatv = query.getBigDecimal("IDIATV");
                Timestamp dhaceite = query.getTimestamp("DHACEITE");
                listaIdiatv.add(idiatv);
                mapaDhaceite.put(idiatv, dhaceite);
            }
            query.close();

            // Processar cada atividade
            int atividadesIniciadas = 0;
            StringBuilder mensagemSucesso = new StringBuilder();

            for (BigDecimal idiatv : listaIdiatv) {
                Timestamp dhaceite = mapaDhaceite.get(idiatv);
                
                // Se a atividade não foi aceita, aceitar antes de iniciar
                if (dhaceite == null) {
                    query = contexto.getQuery();
                    query.setParam("IDIATV_ACEITE", idiatv);
                    query.setParam("CODUSU_ACEITE", codUsu);
                    query.setParam("DHACEITE_ACEITE", dataHoraAtual);
                    query.update(
                        "UPDATE TPRIATV SET " +
                        "CODEXEC = {CODUSU_ACEITE}, " +
                        "CODUSU = {CODUSU_ACEITE}, " +
                        "DHACEITE = {DHACEITE_ACEITE} " +
                        "WHERE IDIATV = {IDIATV_ACEITE}"
                    );
                    query.close();
                }

                // Iniciar a atividade (atualizar DHINICIO)
                query = contexto.getQuery();
                query.setParam("IDIATV_INICIO", idiatv);
                query.setParam("CODUSU_INICIO", codUsu);
                query.setParam("DHINICIO_INICIO", dataHoraAtual);
                query.update(
                    "UPDATE TPRIATV SET " +
                    "DHINICIO = {DHINICIO_INICIO}, " +
                    "CODULTEXEC = {CODUSU_INICIO} " +
                    "WHERE IDIATV = {IDIATV_INICIO}"
                );
                query.close();

                atividadesIniciadas++;
            }

            if (atividadesIniciadas == 0) {
                contexto.mostraErro("Nenhuma atividade encontrada para iniciar no processo IDIPROC: " + idiproc + ". Verifique se existem atividades pendentes.");
                return;
            }

            // Preparar mensagem de sucesso
            mensagemSucesso.append("Produção iniciada com sucesso!\n\n");
            mensagemSucesso.append("Informações:\n");
            mensagemSucesso.append("• IDIPROC: ").append(idiproc).append("\n");
            mensagemSucesso.append("• Lote: ").append(StringUtils.isEmpty(nrolote) ? "N/A" : nrolote).append("\n");
            mensagemSucesso.append("• Atividades iniciadas: ").append(atividadesIniciadas).append("\n");
            mensagemSucesso.append("• Usuário: ").append(codUsu).append("\n");
            mensagemSucesso.append("• Data/Hora: ").append(dataHoraAtual);
            
            if (chamadaRemota) {
                mensagemSucesso.append("\n• Modo: Chamada remota via parâmetros");
            }

            contexto.setMensagemRetorno(mensagemSucesso.toString());
            System.out.println("Produção iniciada - IDIPROC: " + idiproc + ", Atividades: " + atividadesIniciadas + ", Chamada remota: " + chamadaRemota);

        } catch (Exception e) {
            contexto.mostraErro("Erro ao iniciar produção: " + e.getMessage());
            System.out.println("Erro ao iniciar produção: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }

        System.out.println("br.com.triggerint.IniciarProducaoBT1 - FIM");
    }
}

