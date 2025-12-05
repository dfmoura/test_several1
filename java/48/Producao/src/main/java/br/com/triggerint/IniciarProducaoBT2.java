package main.java.br.com.triggerint;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.BigDecimalUtil;
import com.sankhya.util.StringUtils;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Botão de ação para iniciar produção (via API externa) reutilizando os padrões existentes.
 * Realiza autenticação, obtém token dinâmico e dispara operação de início para as atividades do processo.
 */
public class IniciarProducaoBT2 implements AcaoRotinaJava {

    private static final String LOGIN_URL = "https://api.sandbox.sankhya.com.br/login";
    private static final String OPERACAO_URL = "https://api.sandbox.sankhya.com.br/gateway/v1/mgeprod/service.sbr?serviceName=OperacaoProducaoSP.iniciarInstanciaAtividades&application=OperacaoProducao&outputType=json";

    private static final String LOGIN_TOKEN_HEADER = "e9be5881-84dd-426b-96b0-d7963fd7db84";
    private static final String LOGIN_APPKEY_HEADER = "9250975a-bcf3-4d27-84ab-ee8244866b1e";
    private static final String LOGIN_USERNAME = "diogomou@gmail.com";
    private static final String LOGIN_PASSWORD = "Buc110t@20251";

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.IniciarProducaoBT2 - INICIO");

        BigDecimal idiproc = obterIdiproc(contexto);
        if (idiproc == null) {
            // Mensagem já tratada dentro do método.
            return;
        }

        List<BigDecimal> listaIdiatv = buscarIdiAtvPorProcesso(contexto, idiproc);
        if (listaIdiatv.isEmpty()) {
            contexto.mostraErro("Nenhuma atividade vinculada (IDIATV) foi localizada para o processo informado.");
            return;
        }

        HttpResult loginResponse = realizarLogin();
        if (loginResponse == null) {
            contexto.mostraErro("Não foi possível realizar o login na API de produção.");
            return;
        }

        if (loginResponse.status >= 400) {
            contexto.mostraErro("Falha ao autenticar na API: HTTP " + loginResponse.status + " - " + loginResponse.body);
            return;
        }

        String bearerToken = extrairBearerToken(loginResponse);
        if (StringUtils.isEmpty(bearerToken)) {
            contexto.mostraErro("Token dinâmico não foi retornado pelo serviço de login.");
            return;
        }

        HttpResult requisicaoOperacao = executarOperacao(listaIdiatv, bearerToken);
        if (requisicaoOperacao == null) {
            contexto.mostraErro("Não foi possível executar a operação de início de atividades.");
            return;
        }

        if (requisicaoOperacao.status >= 400) {
            contexto.mostraErro("Operação de início de atividades falhou: HTTP " + requisicaoOperacao.status + " - " + requisicaoOperacao.body);
            return;
        }

        Timestamp dataHoraAtual = new Timestamp(new Date().getTime());

        StringBuilder mensagemSucesso = new StringBuilder();
        mensagemSucesso.append("Requisição enviada com sucesso!\n\n");
        mensagemSucesso.append("Informações:\n");
        mensagemSucesso.append("• IDIPROC: ").append(idiproc).append("\n");
        mensagemSucesso.append("• Quantidade de IDIATV enviados: ").append(listaIdiatv.size()).append("\n");
        mensagemSucesso.append("• Data/Hora: ").append(dataHoraAtual).append("\n");
        mensagemSucesso.append("• Código HTTP: ").append(requisicaoOperacao.status).append("\n");

        contexto.setMensagemRetorno(mensagemSucesso.toString());
        System.out.println("br.com.triggerint.IniciarProducaoBT2 - FIM");
    }

    /**
     * Captura o IDIPROC via parâmetro remoto ou linha selecionada, seguindo padrões existentes.
     */
    private BigDecimal obterIdiproc(ContextoAcao contexto) throws Exception {
        BigDecimal idiproc = null;
        Object paramIdiproc = contexto.getParam("P_IDIPROC");

        if (paramIdiproc != null) {
            // Chamada remota (SankhyaJX)
            if (paramIdiproc instanceof BigDecimal) {
                idiproc = (BigDecimal) paramIdiproc;
            } else if (paramIdiproc instanceof String) {
                String valor = (String) paramIdiproc;
                if (StringUtils.isEmpty(valor)) {
                    contexto.mostraErro("Parâmetro P_IDIPROC não pode ser vazio.");
                    return null;
                }
                idiproc = BigDecimalUtil.valueOf(valor);
            } else if (paramIdiproc instanceof Number) {
                idiproc = BigDecimal.valueOf(((Number) paramIdiproc).doubleValue());
            } else {
                contexto.mostraErro("Parâmetro P_IDIPROC possui formato inválido: " + paramIdiproc.getClass().getName());
                return null;
            }
            return idiproc;
        }

        Registro[] linhas = contexto.getLinhas();
        if (linhas == null || linhas.length == 0) {
            contexto.mostraErro("Nenhuma linha foi selecionada e nenhum parâmetro P_IDIPROC foi fornecido.");
            return null;
        }

        if (linhas.length > 1) {
            contexto.mostraErro("Selecione apenas uma linha para executar o botão de ação.");
            return null;
        }

        Registro registroSelecionado = linhas[0];
        Object idiprocObj = registroSelecionado.getCampo("IDIPROC");

        if (idiprocObj == null) {
            contexto.mostraErro("Campo IDIPROC não encontrado na linha selecionada.");
            return null;
        }

        if (idiprocObj instanceof BigDecimal) {
            idiproc = (BigDecimal) idiprocObj;
        } else if (idiprocObj instanceof Number) {
            idiproc = BigDecimal.valueOf(((Number) idiprocObj).doubleValue());
        } else {
            contexto.mostraErro("Campo IDIPROC possui formato inválido.");
            return null;
        }

        return idiproc;
    }

    /**
     * Consulta os IDIATV vinculados ao processo informado, conforme SQL fornecida.
     */
    private List<BigDecimal> buscarIdiAtvPorProcesso(ContextoAcao contexto, BigDecimal idiproc) throws Exception {
        List<BigDecimal> listaIdiatv = new ArrayList<>();
        QueryExecutor query = contexto.getQuery();

        try {
            query.setParam("IDIPROC", idiproc);
            query.nativeSelect(
                "SELECT IATV.IDIATV " +
                "FROM TPRAPA APA " +
                "INNER JOIN TPRAPO APO ON APO.NUAPO = APA.NUAPO " +
                "INNER JOIN TPRIATV IATV ON IATV.IDIATV = APO.IDIATV " +
                "WHERE IATV.IDIPROC = {IDIPROC} " +
                "GROUP BY IATV.IDIATV"
            );

            while (query.next()) {
                BigDecimal idiatv = query.getBigDecimal("IDIATV");
                if (idiatv != null) {
                    listaIdiatv.add(idiatv);
                }
            }
        } finally {
            query.close();
        }

        return listaIdiatv;
    }

    /**
     * Realiza o login na API externa utilizando as credenciais disponibilizadas.
     */
    private HttpResult realizarLogin() {
        Map<String, String> headers = new HashMap<>();
        headers.put("token", LOGIN_TOKEN_HEADER);
        headers.put("appkey", LOGIN_APPKEY_HEADER);
        headers.put("username", LOGIN_USERNAME);
        headers.put("password", LOGIN_PASSWORD);
        headers.put("Content-Type", "application/json");
        return executarPost(LOGIN_URL, "{}", headers);
    }

    /**
     * Extrai o bearer token do cabeçalho ou corpo da resposta de login.
     * Inclui fallback com regex para tokens no formato JWT.
     */
    private String extrairBearerToken(HttpResult loginResponse) {
        try {
            if (loginResponse.headers != null) {
                for (Map.Entry<String, List<String>> entry : loginResponse.headers.entrySet()) {
                    String chave = entry.getKey();
                    if (chave != null && chave.equalsIgnoreCase("Authorization")) {
                        List<String> valores = entry.getValue();
                        if (valores != null && !valores.isEmpty()) {
                            String tokenHeader = valores.get(0);
                            if (!StringUtils.isEmpty(tokenHeader)) {
                                if (tokenHeader.toLowerCase().startsWith("bearer ")) {
                                    return tokenHeader.substring(7);
                                }
                                return tokenHeader;
                            }
                        }
                    }
                }
            }
        } catch (Exception ignore) {
            // Comentário em português: cabeçalhos podem não existir; segue para fallback.
        }

        String corpo = loginResponse.body;
        if (StringUtils.isEmpty(corpo)) {
            return null;
        }

        // Tentativa direta procurando chaves comuns.
        String[] chavesPossiveis = {"token", "access_token", "bearerToken", "authorizationToken", "value"};
        for (String chave : chavesPossiveis) {
            Pattern pattern = Pattern.compile("\"" + chave + "\"\\s*[:=]\\s*\"([^\"]+)\"");
            Matcher matcher = pattern.matcher(corpo);
            if (matcher.find()) {
                return matcher.group(1);
            }
        }

        // Fallback final: capturar primeiro JWT presente no corpo.
        Pattern jwtPattern = Pattern.compile("([A-Za-z0-9_\\-]+=*\\.[A-Za-z0-9_\\-]+=*\\.[A-Za-z0-9_\\-]+=*)");
        Matcher matcher = jwtPattern.matcher(corpo);
        if (matcher.find()) {
            return matcher.group(1);
        }

        return null;
    }

    /**
     * Monta o corpo da requisição e executa a chamada principal com o token dinâmico.
     */
    private HttpResult executarOperacao(List<BigDecimal> listaIdiatv, String bearerToken) {
        String payload = montarPayload(listaIdiatv);
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("Authorization", "Bearer " + bearerToken);
        return executarPost(OPERACAO_URL, payload, headers);
    }

    /**
     * Monta o JSON seguindo o layout fornecido para múltiplos IDIATV.
     */
    private String montarPayload(List<BigDecimal> listaIdiatv) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"serviceName\": \"OperacaoProducaoSP.iniciarInstanciaAtividades\",");
        sb.append("\"requestBody\": {");
        sb.append("\"instancias\": { \"instancia\": [");

        for (int i = 0; i < listaIdiatv.size(); i++) {
            BigDecimal idiatv = listaIdiatv.get(i);
            sb.append("{ \"IDIATV\": { \"$\": ").append(idiatv.toPlainString()).append(" } }");
            if (i < listaIdiatv.size() - 1) {
                sb.append(", ");
            }
        }

        sb.append("] },");
        sb.append("\"clientEventList\": { \"clientEvent\": [");
        sb.append("{ \"$\": \"br.com.sankhya.mgeprod.apontamentos.divergentes\" }, ");
        sb.append("{ \"$\": \"br.com.sankhya.mgeProd.wc.indisponivel\" }, ");
        sb.append("{ \"$\": \"br.com.sankhya.mgeprod.redimensionar.op.pa.perda\" }, ");
        sb.append("{ \"$\": \"br.com.sankhya.mgeprod.redimensionar.op.pa.avisos\" }, ");
        sb.append("{ \"$\": \"br.com.sankhya.mgeprod.trocaturno.avisos\" }, ");
        sb.append("{ \"$\": \"br.com.sankhya.mgeprod.finalizar.liberacao.desvio.pa\" }, ");
        sb.append("{ \"$\": \"br.com.sankhya.actionbutton.clientconfirm\" }");
        sb.append("] }");
        sb.append("}");
        sb.append("}");

        return sb.toString();
    }

    /**
     * Executa requisições POST com HttpURLConnection mantendo compatibilidade com Java 8.
     */
    private HttpResult executarPost(String urlDestino, String payload, Map<String, String> headers) {
        HttpURLConnection conexao = null;
        try {
            URL url = new URL(urlDestino);
            conexao = (HttpURLConnection) url.openConnection();
            conexao.setRequestMethod("POST");
            conexao.setConnectTimeout(0); // Comentário: timeout 0 mantém espera ilimitada, conforme instrução.
            conexao.setReadTimeout(0);
            conexao.setDoInput(true);

            if (headers != null) {
                for (Map.Entry<String, String> entry : headers.entrySet()) {
                    conexao.setRequestProperty(entry.getKey(), entry.getValue());
                }
            }

            if (payload != null) {
                byte[] dados = payload.getBytes(StandardCharsets.UTF_8);
                conexao.setDoOutput(true);
                try (OutputStream os = conexao.getOutputStream()) {
                    os.write(dados);
                    os.flush();
                }
            }

            int status = conexao.getResponseCode();
            String corpo = lerCorpoResposta(conexao, status);

            return new HttpResult(status, corpo, conexao.getHeaderFields());
        } catch (IOException e) {
            System.out.println("Falha na chamada HTTP: " + e.getMessage());
            return null;
        } finally {
            if (conexao != null) {
                conexao.disconnect();
            }
        }
    }

    /**
     * Lê o corpo da resposta tratando fluxos de erro quando necessário.
     */
    private String lerCorpoResposta(HttpURLConnection conexao, int status) throws IOException {
        InputStream stream = status >= 400 ? conexao.getErrorStream() : conexao.getInputStream();
        if (stream == null) {
            return "";
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String linha;
            while ((linha = reader.readLine()) != null) {
                sb.append(linha);
            }
            return sb.toString();
        }
    }

    /**
     * Estrutura simples para transportar resultados HTTP sem dependências externas.
     */
    private static class HttpResult {
        private final int status;
        private final String body;
        private final Map<String, List<String>> headers;

        private HttpResult(int status, String body, Map<String, List<String>> headers) {
            this.status = status;
            this.body = body;
            this.headers = headers;
        }
    }
}

