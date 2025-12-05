package br.com.triggerint.atualizaparceiros;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.BigDecimalUtil;
import com.sankhya.util.StringUtils;

import java.math.BigDecimal;
import java.sql.Timestamp;


    public class ImportarBT implements AcaoRotinaJava {
        @Override
        public void doAction(ContextoAcao contexto) throws Exception {
            System.out.println("Importação BT - Início");

            // Capturar nufin da tela atual
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
            
            System.out.println("NUFIN capturado: " + (nufin != null ? nufin.toString() : "não encontrado"));
            
            // buscar na tsianx este nufin no campo pkregistro (tratar o campo pois xxxx_financeiro)
            // armazenar o chavearquivo da tsianx
            // e buscar com base no caminho ----     Repositório/Sistema/Anexos/Financeiro/ + chavearquivo

                    System.out.println("Importação - Fim");
        }
    }
