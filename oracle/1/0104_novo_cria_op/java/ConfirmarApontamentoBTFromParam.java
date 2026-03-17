package br.com.triggerint.modulos.snk.acoes;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.StringUtils;

import java.math.BigDecimal;

/**
 * Botão de ação Java para confirmar um apontamento de produção existente
 * (TPRAPO/TPRAPA), espelhando o comportamento principal do serviço
 * OperacaoProducaoSP.confirmarApontamento conforme os logs em
 * logs_confirmar_apontamento.
 *
 * Fluxo principal observado nos logs:
 * 1) Validar existência do NUAPO em TPRAPO.
 * 2) Verificar se o apontamento está em situação 'P' (pendente) e ainda não confirmado.
 * 3) Verificar se não há itens em TPRAPA com QTDAPONTADA = 0 para o NUAPO.
 * 4) Confirmar o apontamento:
 *      UPDATE TPRAPO SET SITUACAO = 'C' WHERE TPRAPO.NUAPO = ?
 *
 * Suporta execução via:
 * - Parâmetro NUAPO quando acionado pelo componente HTML5 (JSP) via JX.acionarBotao.
 * - Linha selecionada na grid (campo NUAPO) em tela nativa.
 *
 * No Sankhya: cadastre um botão de ação Java apontando para esta classe e use
 * o ID desse botão no JSP (ex.: idBotao: XXX). No JSP, parâmetro enviado: NUAPO.
 */
public class ConfirmarApontamentoBTFromParam implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.modulos.snk.acoes.ConfirmarApontamentoBTFromParam - INICIO");

        BigDecimal nuapo = obterNuapo(contexto);
        if (nuapo == null) {
            return;
        }

        BigDecimal codUsu = contexto.getUsuarioLogado();
        if (codUsu == null) {
            contexto.mostraErro("Não foi possível identificar o usuário logado.");
            return;
        }

        QueryExecutor query = contexto.getQuery();
        try {
            // 1) Validar existência do apontamento e situação atual
            query.setParam("NUAPO", nuapo);
            query.nativeSelect("SELECT NUAPO, SITUACAO FROM TPRAPO WHERE NUAPO = {NUAPO}");

            if (!query.next()) {
                contexto.mostraErro("Apontamento não encontrado. NUAPO: " + nuapo);
                return;
            }

            String situacao = query.getString("SITUACAO");
            query.close();

            if (StringUtils.isEmpty(situacao)) {
                contexto.mostraErro("Situação do apontamento não definida para NUAPO: " + nuapo);
                return;
            }

            if ("C".equalsIgnoreCase(situacao)) {
                contexto.mostraErro("Apontamento já confirmado. NUAPO: " + nuapo);
                return;
            }

            if (!"P".equalsIgnoreCase(situacao)) {
                contexto.mostraErro("Somente apontamentos pendentes (situação 'P') podem ser confirmados. Situação atual: "
                        + situacao + " | NUAPO: " + nuapo);
                return;
            }

            // 2) Verificar se há itens com quantidade apontada igual a zero (espelho do SELECT TPRAPA ... QTDAPONTADA = 0)
            query = contexto.getQuery();
            query.setParam("NUAPO", nuapo);
            query.nativeSelect(
                    "SELECT 1 FROM TPRAPA PA " +
                            "WHERE PA.QTDAPONTADA = 0 " +
                            "AND PA.NUAPO = {NUAPO}"
            );

            if (query.next()) {
                query.close();
                contexto.mostraErro("Não é possível confirmar o apontamento. Existem itens com quantidade apontada igual a zero para o NUAPO: " + nuapo + ".");
                return;
            }
            query.close();

            // 3) Confirmar o apontamento: UPDATE TPRAPO SET SITUACAO = 'C' WHERE NUAPO = ?
            query = contexto.getQuery();
            query.setParam("SITUACAO", "C");
            query.setParam("NUAPO", nuapo);
            query.update("UPDATE TPRAPO SET SITUACAO = {SITUACAO} WHERE NUAPO = {NUAPO}");
            query.close();

            StringBuilder msg = new StringBuilder();
            msg.append("Apontamento confirmado com sucesso!\n\n");
            msg.append("Informações:\n");
            msg.append("• NUAPO: ").append(nuapo).append("\n");
            msg.append("• Usuário: ").append(codUsu).append("\n");

            contexto.setMensagemRetorno(msg.toString());
            System.out.println("Apontamento confirmado - NUAPO: " + nuapo);

        } catch (Exception e) {
            contexto.mostraErro("Erro ao confirmar apontamento: " + e.getMessage());
            System.out.println("Erro ao confirmar apontamento: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }

        System.out.println("br.com.triggerint.modulos.snk.acoes.ConfirmarApontamentoBTFromParam - FIM");
    }

    /**
     * Obtém NUAPO: primeiro do parâmetro NUAPO (chamada via JX.acionarBotao no HTML5),
     * depois da linha selecionada (comportamento em tela nativa).
     */
    private BigDecimal obterNuapo(ContextoAcao contexto) throws Exception {
        Object param = contexto.getParam("NUAPO");
        if (param == null) {
            param = contexto.getParam("nuapo");
        }

        if (param != null) {
            System.out.println("ConfirmarApontamentoBTFromParam - Parâmetro NUAPO recebido: " + param);
            if (param instanceof BigDecimal) {
                return (BigDecimal) param;
            }
            if (param instanceof Number) {
                return BigDecimal.valueOf(((Number) param).doubleValue());
            }
            if (param instanceof String) {
                String s = ((String) param).trim();
                if (s.isEmpty()) {
                    contexto.mostraErro("Parâmetro NUAPO não pode ser vazio.");
                    return null;
                }
                try {
                    return new BigDecimal(s);
                } catch (NumberFormatException e) {
                    contexto.mostraErro("Parâmetro NUAPO inválido: " + s);
                    return null;
                }
            }
            contexto.mostraErro("Parâmetro NUAPO possui formato inválido.");
            return null;
        }

        Registro[] linhas = contexto.getLinhas();
        if (linhas != null && linhas.length == 1) {
            Object nuapoObj = linhas[0].getCampo("NUAPO");
            if (nuapoObj != null) {
                if (nuapoObj instanceof BigDecimal) {
                    return (BigDecimal) nuapoObj;
                }
                if (nuapoObj instanceof Number) {
                    return BigDecimal.valueOf(((Number) nuapoObj).doubleValue());
                }
                if (nuapoObj instanceof String) {
                    String s = ((String) nuapoObj).trim();
                    if (!s.isEmpty()) {
                        try {
                            return new BigDecimal(s);
                        } catch (NumberFormatException e) {
                            contexto.mostraErro("Valor de NUAPO inválido na linha selecionada: " + s);
                            return null;
                        }
                    }
                }
            }
        }

        contexto.mostraErro("Nenhum NUAPO informado. No componente HTML5, envie o NUAPO no JX.acionarBotao({ NUAPO: x }).");
        return null;
    }
}

