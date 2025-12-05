package token;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.Key;
import java.security.KeyFactory;
import java.security.KeyManagementException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.UnrecoverableKeyException;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.util.Base64;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class ObterTokenOauth {

    public static void main (String[] args) throws URISyntaxException, IOException, InterruptedException, CertificateException, UnrecoverableKeyException, NoSuchAlgorithmException, KeyStoreException, KeyManagementException, InvalidKeySpecException {
        String urlInter = "https://cdpj.partners.bancointer.com.br";
        String nomeArquivoCertificado = "<nome arquivo certificado>.crt";
        String nomeArquivoChave = "<nome arquivo chave privada>.key";
        String clientId = "<clientId de sua aplicação>";
        String clientSecret = "<clientSecret de sua aplicação>";
        String contaCorrente = "<conta corrente selecionada>";

        String permissoes = "extrato.read";

        KeyManagerFactory keyMgrFactory = getKeyManagerFactory(nomeArquivoCertificado, nomeArquivoChave);

        // populate SSLContext with key manager
        SSLContext sslCtx = SSLContext.getInstance("TLSv1.2");
        sslCtx.init(keyMgrFactory.getKeyManagers(), null, null);

        SSLParameters sslParam = new SSLParameters();
        sslParam.setNeedClientAuth(true);

        //Obter o bearer token
        ResponseTokenModel responseTokenModel = obterBearerToken(urlInter, clientId, clientSecret, permissoes, sslCtx, sslParam);
        String bearerToken = responseTokenModel.getAccessToken();

        System.exit(0);
    }

    private static ResponseTokenModel obterBearerToken(String urlInter, String clientId, String clientSecret, String permissoes, SSLContext sslCtx, SSLParameters sslParam) throws IOException, InterruptedException {
        // ----------------------------------------------
        //Acessa o Inter para obter o token
        // ----------------------------------------------
        Map<Object, Object> data = new HashMap<>();
        data.put("client_id", clientId);
        data.put("client_secret", clientSecret);
        data.put("scope", permissoes);
        data.put("grant_type", "client_credentials");

        HttpRequest.BodyPublisher body = ofFormData(data);

        HttpRequest requestToken = HttpRequest.newBuilder()
                .POST(body)
                .uri(URI.create(urlInter + "/oauth/v2/token"))
                .setHeader("User-Agent", "Java 11 HttpClient")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .build();

        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .connectTimeout(Duration.ofSeconds(10))
                .sslContext(sslCtx)
                .sslParameters(sslParam)
                .build();

        HttpResponse<String> responseToken = httpClient.send(requestToken, HttpResponse.BodyHandlers.ofString());

        ObjectMapper mapper = new ObjectMapper();

        return mapper.readValue(responseToken.body(), ResponseTokenModel.class);
    }

    private static KeyManagerFactory getKeyManagerFactory(String nomeArquivoCertificado, String nomeArquivoChave) throws IOException, CertificateException, NoSuchAlgorithmException, InvalidKeySpecException, KeyStoreException, UnrecoverableKeyException, KeyManagementException {
        // cert+key data. assuming X509 pem format
        byte[] cert = Files.readAllBytes(Path.of(nomeArquivoCertificado));

        byte[] keyTemp = Files.readAllBytes(Path.of(nomeArquivoChave));
        byte[] key = new String(keyTemp, Charset.defaultCharset())
-----BEGIN PRIVATE KEY-----
REDACTED
-----END PRIVATE KEY-----

        // cert+key data. assuming X509 pem format

        // parse certificate
        final CertificateFactory certificateFactory = CertificateFactory.getInstance("X.509");
        final Collection<? extends Certificate> chain = certificateFactory.generateCertificates(
                new ByteArrayInputStream(cert));

        byte[] encoded = Base64.getDecoder().decode(key);
        // parse key
        final Key keyEncoded = KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(encoded));

        // place cert+key into KeyStore
        KeyStore clientKeyStore = KeyStore.getInstance("jks");
        final char[] pwdChars = "REDACTED".toCharArray();
        clientKeyStore.load(null, null);
        clientKeyStore.setKeyEntry("test", keyEncoded, pwdChars, chain.toArray(new Certificate[0]));

        // initialize KeyManagerFactory
        KeyManagerFactory keyMgrFactory = KeyManagerFactory.getInstance("SunX509");
        keyMgrFactory.init(clientKeyStore, pwdChars);

        return keyMgrFactory;
    }

    private static HttpRequest.BodyPublisher ofFormData(Map<Object, Object> data) {
        var builder = new StringBuilder();
        for (Map.Entry<Object, Object> entry : data.entrySet()) {
            if (builder.length() > 0) {
                builder.append("&");
            }
            builder.append(URLEncoder.encode(entry.getKey().toString(), StandardCharsets.UTF_8));
            builder.append("=");
            builder.append(URLEncoder.encode(entry.getValue().toString(), StandardCharsets.UTF_8));
        }

        return HttpRequest.BodyPublishers.ofString(builder.toString());
    }

    public static class ResponseTokenModel {
        private String accessToken;
        private String tokenType;
        private String expiresIn;
        private String scope;

        @JsonProperty("access_token")
        public String getAccessToken() {
            return accessToken;
        }

        public void setAccessToken(String accessToken) {
            this.accessToken = accessToken;
        }

        @JsonProperty("token_type")
        public String getTokenType() {
            return tokenType;
        }

        public void setTokenType(String tokenType) {
            this.tokenType = tokenType;
        }

        @JsonProperty("expires_in")
        public String getExpiresIn() {
            return expiresIn;
        }

        public void setExpiresIn(String expiresIn) {
            this.expiresIn = expiresIn;
        }

        @JsonProperty("scope")
        public String getScope() {
            return scope;
        }

        public void setScope(String scope) {
            this.scope = scope;
        }
    }
}