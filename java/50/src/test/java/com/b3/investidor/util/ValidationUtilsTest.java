package com.b3.investidor.util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Testes unitários para ValidationUtils
 */
public class ValidationUtilsTest {
    
    @Test
    public void testValidCPF() {
        // CPF válido
        assertTrue(ValidationUtils.isValidCPF("11144477735"));
        assertTrue(ValidationUtils.isValidCPF("111.444.777-35"));
        assertTrue(ValidationUtils.isValidCPF("111 444 777 35"));
        
        // CPF inválido
        assertFalse(ValidationUtils.isValidCPF("11144477734"));
        assertFalse(ValidationUtils.isValidCPF("12345678901"));
        assertFalse(ValidationUtils.isValidCPF("11111111111"));
        assertFalse(ValidationUtils.isValidCPF(""));
        assertFalse(ValidationUtils.isValidCPF(null));
    }
    
    @Test
    public void testValidCNPJ() {
        // CNPJ válido
        assertTrue(ValidationUtils.isValidCNPJ("11222333000181"));
        assertTrue(ValidationUtils.isValidCNPJ("11.222.333/0001-81"));
        
        // CNPJ inválido
        assertFalse(ValidationUtils.isValidCNPJ("11222333000180"));
        assertFalse(ValidationUtils.isValidCNPJ("12345678000190"));
        assertFalse(ValidationUtils.isValidCNPJ("11111111000111"));
        assertFalse(ValidationUtils.isValidCNPJ(""));
        assertFalse(ValidationUtils.isValidCNPJ(null));
    }
    
    @Test
    public void testValidDocument() {
        // Documentos válidos
        assertTrue(ValidationUtils.isValidDocument("11144477735")); // CPF
        assertTrue(ValidationUtils.isValidDocument("11222333000181")); // CNPJ
        
        // Documentos inválidos
        assertFalse(ValidationUtils.isValidDocument("123456789")); // Muito curto
        assertFalse(ValidationUtils.isValidDocument("123456789012345")); // Muito longo
        assertFalse(ValidationUtils.isValidDocument(""));
        assertFalse(ValidationUtils.isValidDocument(null));
    }
    
    @Test
    public void testFormatDocument() {
        assertEquals("11144477735", ValidationUtils.formatDocument("111.444.777-35"));
        assertEquals("11222333000181", ValidationUtils.formatDocument("11.222.333/0001-81"));
        assertEquals("12345678901", ValidationUtils.formatDocument("123.456.789-01"));
        assertNull(ValidationUtils.formatDocument(null));
    }
}
