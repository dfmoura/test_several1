package com.b3.investidor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Date;
import java.util.List;

/**
 * Classe que representa um evento provisionado individual
 */
public class ProvisionedEvents {
    
    @JsonProperty("documentNumber")
    private String documentNumber;
    
    @JsonProperty("referenceDate")
    private Date referenceDate;
    
    @JsonProperty("productCategoryName")
    private String productCategoryName;
    
    @JsonProperty("productTypeName")
    private String productTypeName;
    
    @JsonProperty("corporateActionTypeDescription")
    private String corporateActionTypeDescription;
    
    @JsonProperty("paymentDate")
    private Date paymentDate;
    
    @JsonProperty("participantName")
    private String participantName;
    
    @JsonProperty("participantDocumentNumber")
    private String participantDocumentNumber;
    
    @JsonProperty("eventValue")
    private Double eventValue;
    
    @JsonProperty("eventQuantity")
    private Double eventQuantity;
    
    @JsonProperty("netValue")
    private Double netValue;
    
    @JsonProperty("tickerSymbol")
    private String tickerSymbol;
    
    @JsonProperty("isin")
    private String isin;
    
    @JsonProperty("distributionIdentification")
    private Integer distributionIdentification;
    
    @JsonProperty("bookkeeperName")
    private String bookkeeperName;
    
    @JsonProperty("corporationName")
    private String corporationName;
    
    @JsonProperty("specificationCode")
    private String specificationCode;
    
    @JsonProperty("approvalDate")
    private Date approvalDate;
    
    @JsonProperty("updateDate")
    private Date updateDate;
    
    @JsonProperty("specialExDate")
    private Date specialExDate;
    
    @JsonProperty("incomeTaxPercent")
    private Double incomeTaxPercent;
    
    @JsonProperty("incomeTaxAmount")
    private Double incomeTaxAmount;
    
    @JsonProperty("grossAmount")
    private Double grossAmount;
    
    @JsonProperty("availableQuantity")
    private Double availableQuantity;
    
    @JsonProperty("unavailableQuantity")
    private Double unavailableQuantity;
    
    @JsonProperty("reasons")
    private List<Reason> reasons;
    
    // Construtores
    public ProvisionedEvents() {}
    
    // Getters e Setters
    public String getDocumentNumber() {
        return documentNumber;
    }
    
    public void setDocumentNumber(String documentNumber) {
        this.documentNumber = documentNumber;
    }
    
    public Date getReferenceDate() {
        return referenceDate;
    }
    
    public void setReferenceDate(Date referenceDate) {
        this.referenceDate = referenceDate;
    }
    
    public String getProductCategoryName() {
        return productCategoryName;
    }
    
    public void setProductCategoryName(String productCategoryName) {
        this.productCategoryName = productCategoryName;
    }
    
    public String getProductTypeName() {
        return productTypeName;
    }
    
    public void setProductTypeName(String productTypeName) {
        this.productTypeName = productTypeName;
    }
    
    public String getCorporateActionTypeDescription() {
        return corporateActionTypeDescription;
    }
    
    public void setCorporateActionTypeDescription(String corporateActionTypeDescription) {
        this.corporateActionTypeDescription = corporateActionTypeDescription;
    }
    
    public Date getPaymentDate() {
        return paymentDate;
    }
    
    public void setPaymentDate(Date paymentDate) {
        this.paymentDate = paymentDate;
    }
    
    public String getParticipantName() {
        return participantName;
    }
    
    public void setParticipantName(String participantName) {
        this.participantName = participantName;
    }
    
    public String getParticipantDocumentNumber() {
        return participantDocumentNumber;
    }
    
    public void setParticipantDocumentNumber(String participantDocumentNumber) {
        this.participantDocumentNumber = participantDocumentNumber;
    }
    
    public Double getEventValue() {
        return eventValue;
    }
    
    public void setEventValue(Double eventValue) {
        this.eventValue = eventValue;
    }
    
    public Double getEventQuantity() {
        return eventQuantity;
    }
    
    public void setEventQuantity(Double eventQuantity) {
        this.eventQuantity = eventQuantity;
    }
    
    public Double getNetValue() {
        return netValue;
    }
    
    public void setNetValue(Double netValue) {
        this.netValue = netValue;
    }
    
    public String getTickerSymbol() {
        return tickerSymbol;
    }
    
    public void setTickerSymbol(String tickerSymbol) {
        this.tickerSymbol = tickerSymbol;
    }
    
    public String getIsin() {
        return isin;
    }
    
    public void setIsin(String isin) {
        this.isin = isin;
    }
    
    public Integer getDistributionIdentification() {
        return distributionIdentification;
    }
    
    public void setDistributionIdentification(Integer distributionIdentification) {
        this.distributionIdentification = distributionIdentification;
    }
    
    public String getBookkeeperName() {
        return bookkeeperName;
    }
    
    public void setBookkeeperName(String bookkeeperName) {
        this.bookkeeperName = bookkeeperName;
    }
    
    public String getCorporationName() {
        return corporationName;
    }
    
    public void setCorporationName(String corporationName) {
        this.corporationName = corporationName;
    }
    
    public String getSpecificationCode() {
        return specificationCode;
    }
    
    public void setSpecificationCode(String specificationCode) {
        this.specificationCode = specificationCode;
    }
    
    public Date getApprovalDate() {
        return approvalDate;
    }
    
    public void setApprovalDate(Date approvalDate) {
        this.approvalDate = approvalDate;
    }
    
    public Date getUpdateDate() {
        return updateDate;
    }
    
    public void setUpdateDate(Date updateDate) {
        this.updateDate = updateDate;
    }
    
    public Date getSpecialExDate() {
        return specialExDate;
    }
    
    public void setSpecialExDate(Date specialExDate) {
        this.specialExDate = specialExDate;
    }
    
    public Double getIncomeTaxPercent() {
        return incomeTaxPercent;
    }
    
    public void setIncomeTaxPercent(Double incomeTaxPercent) {
        this.incomeTaxPercent = incomeTaxPercent;
    }
    
    public Double getIncomeTaxAmount() {
        return incomeTaxAmount;
    }
    
    public void setIncomeTaxAmount(Double incomeTaxAmount) {
        this.incomeTaxAmount = incomeTaxAmount;
    }
    
    public Double getGrossAmount() {
        return grossAmount;
    }
    
    public void setGrossAmount(Double grossAmount) {
        this.grossAmount = grossAmount;
    }
    
    public Double getAvailableQuantity() {
        return availableQuantity;
    }
    
    public void setAvailableQuantity(Double availableQuantity) {
        this.availableQuantity = availableQuantity;
    }
    
    public Double getUnavailableQuantity() {
        return unavailableQuantity;
    }
    
    public void setUnavailableQuantity(Double unavailableQuantity) {
        this.unavailableQuantity = unavailableQuantity;
    }
    
    public List<Reason> getReasons() {
        return reasons;
    }
    
    public void setReasons(List<Reason> reasons) {
        this.reasons = reasons;
    }
    
    @Override
    public String toString() {
        return "ProvisionedEvents{" +
                "documentNumber='" + documentNumber + '\'' +
                ", referenceDate=" + referenceDate +
                ", productCategoryName='" + productCategoryName + '\'' +
                ", productTypeName='" + productTypeName + '\'' +
                ", corporateActionTypeDescription='" + corporateActionTypeDescription + '\'' +
                ", paymentDate=" + paymentDate +
                ", participantName='" + participantName + '\'' +
                ", eventValue=" + eventValue +
                ", netValue=" + netValue +
                ", tickerSymbol='" + tickerSymbol + '\'' +
                ", corporationName='" + corporationName + '\'' +
                '}';
    }
}
