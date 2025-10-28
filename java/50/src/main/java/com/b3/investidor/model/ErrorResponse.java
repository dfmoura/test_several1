package com.b3.investidor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Classe que representa uma resposta de erro da API
 */
public class ErrorResponse {
    
    @JsonProperty("Errors")
    private List<Error> errors;
    
    // Construtores
    public ErrorResponse() {}
    
    public ErrorResponse(List<Error> errors) {
        this.errors = errors;
    }
    
    // Getters e Setters
    public List<Error> getErrors() {
        return errors;
    }
    
    public void setErrors(List<Error> errors) {
        this.errors = errors;
    }
    
    @Override
    public String toString() {
        return "ErrorResponse{" +
                "errors=" + errors +
                '}';
    }
}
