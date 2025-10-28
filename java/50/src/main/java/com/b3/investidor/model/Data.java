package com.b3.investidor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Classe que representa os dados retornados pela API
 */
public class Data {
    
    @JsonProperty("provisionedEvents")
    private List<ProvisionedEvents> provisionedEvents;
    
    // Construtores
    public Data() {}
    
    public Data(List<ProvisionedEvents> provisionedEvents) {
        this.provisionedEvents = provisionedEvents;
    }
    
    // Getters e Setters
    public List<ProvisionedEvents> getProvisionedEvents() {
        return provisionedEvents;
    }
    
    public void setProvisionedEvents(List<ProvisionedEvents> provisionedEvents) {
        this.provisionedEvents = provisionedEvents;
    }
    
    @Override
    public String toString() {
        return "Data{" +
                "provisionedEvents=" + provisionedEvents +
                '}';
    }
}
