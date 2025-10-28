package com.b3.investidor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Classe que representa um erro individual da API
 */
public class Error {
    
    @JsonProperty("code")
    private String code;
    
    @JsonProperty("message")
    private String message;
    
    // Construtores
    public Error() {}
    
    public Error(String code, String message) {
        this.code = code;
        this.message = message;
    }
    
    // Getters e Setters
    public String getCode() {
        return code;
    }
    
    public void setCode(String code) {
        this.code = code;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    @Override
    public String toString() {
        return "Error{" +
                "code='" + code + '\'' +
                ", message='" + message + '\'' +
                '}';
    }
}
