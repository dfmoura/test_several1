package com.b3.investidor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Classe que representa a resposta da API de Eventos Provisionados da B3
 */
public class ProvisionedEventsResponse {
    
    @JsonProperty("data")
    private Data data;
    
    @JsonProperty("Links")
    private Link links;
    
    // Construtores
    public ProvisionedEventsResponse() {}
    
    public ProvisionedEventsResponse(Data data, Link links) {
        this.data = data;
        this.links = links;
    }
    
    // Getters e Setters
    public Data getData() {
        return data;
    }
    
    public void setData(Data data) {
        this.data = data;
    }
    
    public Link getLinks() {
        return links;
    }
    
    public void setLinks(Link links) {
        this.links = links;
    }
    
    @Override
    public String toString() {
        return "ProvisionedEventsResponse{" +
                "data=" + data +
                ", links=" + links +
                '}';
    }
}
