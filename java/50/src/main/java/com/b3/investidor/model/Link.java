package com.b3.investidor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Classe que representa os links de paginação da API
 */
public class Link {
    
    @JsonProperty("self")
    private String self;
    
    @JsonProperty("first")
    private String first;
    
    @JsonProperty("prev")
    private String prev;
    
    @JsonProperty("next")
    private String next;
    
    @JsonProperty("last")
    private String last;
    
    // Construtores
    public Link() {}
    
    public Link(String self, String first, String prev, String next, String last) {
        this.self = self;
        this.first = first;
        this.prev = prev;
        this.next = next;
        this.last = last;
    }
    
    // Getters e Setters
    public String getSelf() {
        return self;
    }
    
    public void setSelf(String self) {
        this.self = self;
    }
    
    public String getFirst() {
        return first;
    }
    
    public void setFirst(String first) {
        this.first = first;
    }
    
    public String getPrev() {
        return prev;
    }
    
    public void setPrev(String prev) {
        this.prev = prev;
    }
    
    public String getNext() {
        return next;
    }
    
    public void setNext(String next) {
        this.next = next;
    }
    
    public String getLast() {
        return last;
    }
    
    public void setLast(String last) {
        this.last = last;
    }
    
    @Override
    public String toString() {
        return "Link{" +
                "self='" + self + '\'' +
                ", first='" + first + '\'' +
                ", prev='" + prev + '\'' +
                ", next='" + next + '\'' +
                ", last='" + last + '\'' +
                '}';
    }
}
