package com.mitralab;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "mitralab")
public class MitralabProperties {

    private Ai ai = new Ai();
    /** Dev only: allow storing password on ExternalConnectionEntity.devPassword */
    private boolean allowInlineConnectionPassword;

    public Ai getAi() {
        return ai;
    }

    public void setAi(Ai ai) {
        this.ai = ai;
    }

    public boolean isAllowInlineConnectionPassword() {
        return allowInlineConnectionPassword;
    }

    public void setAllowInlineConnectionPassword(boolean allowInlineConnectionPassword) {
        this.allowInlineConnectionPassword = allowInlineConnectionPassword;
    }

    public static class Ai {
        private String provider = "mock";
        private OpenAi openai = new OpenAi();
        private Ollama ollama = new Ollama();

        public String getProvider() {
            return provider;
        }

        public void setProvider(String provider) {
            this.provider = provider;
        }

        public OpenAi getOpenai() {
            return openai;
        }

        public void setOpenai(OpenAi openai) {
            this.openai = openai;
        }

        public Ollama getOllama() {
            return ollama;
        }

        public void setOllama(Ollama ollama) {
            this.ollama = ollama;
        }
    }

    public static class OpenAi {
        private String apiKey = "";
        private String model = "gpt-4o-mini";
        private String baseUrl = "https://api.openai.com";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }
    }

    public static class Ollama {
        private String baseUrl = "http://localhost:11434";
        private String model = "llama3.2";

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }
    }
}
