package com.b3.investidor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Classe que representa os motivos de indisponibilidade de ativos
 */
public class Reason {
    
    @JsonProperty("reasonName")
    private String reasonName;
    
    @JsonProperty("collateralQuantity")
    private Double collateralQuantity;
    
    @JsonProperty("counterpartName")
    private String counterpartName;
    
    // Construtores
    public Reason() {}
    
    public Reason(String reasonName, Double collateralQuantity, String counterpartName) {
        this.reasonName = reasonName;
        this.collateralQuantity = collateralQuantity;
        this.counterpartName = counterpartName;
    }
    
    // Getters e Setters
    public String getReasonName() {
        return reasonName;
    }
    
    public void setReasonName(String reasonName) {
        this.reasonName = reasonName;
    }
    
    public Double getCollateralQuantity() {
        return collateralQuantity;
    }
    
    public void setCollateralQuantity(Double collateralQuantity) {
        this.collateralQuantity = collateralQuantity;
    }
    
    public String getCounterpartName() {
        return counterpartName;
    }
    
    public void setCounterpartName(String counterpartName) {
        this.counterpartName = counterpartName;
    }
    
    @Override
    public String toString() {
        return "Reason{" +
                "reasonName='" + reasonName + '\'' +
                ", collateralQuantity=" + collateralQuantity +
                ", counterpartName='" + counterpartName + '\'' +
                '}';
    }
}
