package com.b3.investidor.util;

import java.util.Calendar;
import java.util.Date;
import java.util.regex.Pattern;

/**
 * Utilitários para validação de dados
 */
public class ValidationUtils {
    
    // Padrões de validação
    private static final Pattern CPF_PATTERN = Pattern.compile("^\\d{11}$");
    private static final Pattern CNPJ_PATTERN = Pattern.compile("^\\d{14}$");
    private static final Pattern DOCUMENT_PATTERN = Pattern.compile("^\\d{11,14}$");
    
    /**
     * Valida se um CPF tem 11 dígitos
     * @param cpf CPF a ser validado
     * @return true se válido
     */
    public static boolean isValidCPF(String cpf) {
        if (cpf == null || cpf.trim().isEmpty()) {
            return false;
        }
        
        // Remove caracteres não numéricos
        String cleanCpf = cpf.replaceAll("\\D", "");
        
        return CPF_PATTERN.matcher(cleanCpf).matches() && isValidCPFDigits(cleanCpf);
    }
    
    /**
     * Valida se um CNPJ tem 14 dígitos
     * @param cnpj CNPJ a ser validado
     * @return true se válido
     */
    public static boolean isValidCNPJ(String cnpj) {
        if (cnpj == null || cnpj.trim().isEmpty()) {
            return false;
        }
        
        // Remove caracteres não numéricos
        String cleanCnpj = cnpj.replaceAll("\\D", "");
        
        return CNPJ_PATTERN.matcher(cleanCnpj).matches() && isValidCNPJDigits(cleanCnpj);
    }
    
    /**
     * Valida se um documento (CPF ou CNPJ) tem formato válido
     * @param document Documento a ser validado
     * @return true se válido
     */
    public static boolean isValidDocument(String document) {
        if (document == null || document.trim().isEmpty()) {
            return false;
        }
        
        // Remove caracteres não numéricos
        String cleanDocument = document.replaceAll("\\D", "");
        
        if (!DOCUMENT_PATTERN.matcher(cleanDocument).matches()) {
            return false;
        }
        
        // Valida CPF se tiver 11 dígitos
        if (cleanDocument.length() == 11) {
            return isValidCPFDigits(cleanDocument);
        }
        
        // Valida CNPJ se tiver 14 dígitos
        if (cleanDocument.length() == 14) {
            return isValidCNPJDigits(cleanDocument);
        }
        
        return false;
    }
    
    /**
     * Valida os dígitos verificadores do CPF
     */
    private static boolean isValidCPFDigits(String cpf) {
        if (cpf.length() != 11) {
            return false;
        }
        
        // Verifica se todos os dígitos são iguais
        if (cpf.matches("(\\d)\\1{10}")) {
            return false;
        }
        
        // Calcula o primeiro dígito verificador
        int sum = 0;
        for (int i = 0; i < 9; i++) {
            sum += Character.getNumericValue(cpf.charAt(i)) * (10 - i);
        }
        int firstDigit = 11 - (sum % 11);
        if (firstDigit >= 10) {
            firstDigit = 0;
        }
        
        // Calcula o segundo dígito verificador
        sum = 0;
        for (int i = 0; i < 10; i++) {
            sum += Character.getNumericValue(cpf.charAt(i)) * (11 - i);
        }
        int secondDigit = 11 - (sum % 11);
        if (secondDigit >= 10) {
            secondDigit = 0;
        }
        
        // Verifica se os dígitos verificadores estão corretos
        return Character.getNumericValue(cpf.charAt(9)) == firstDigit &&
               Character.getNumericValue(cpf.charAt(10)) == secondDigit;
    }
    
    /**
     * Valida os dígitos verificadores do CNPJ
     */
    private static boolean isValidCNPJDigits(String cnpj) {
        if (cnpj.length() != 14) {
            return false;
        }
        
        // Verifica se todos os dígitos são iguais
        if (cnpj.matches("(\\d)\\1{13}")) {
            return false;
        }
        
        // Calcula o primeiro dígito verificador
        int[] weights1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum = 0;
        for (int i = 0; i < 12; i++) {
            sum += Character.getNumericValue(cnpj.charAt(i)) * weights1[i];
        }
        int firstDigit = sum % 11;
        firstDigit = firstDigit < 2 ? 0 : 11 - firstDigit;
        
        // Calcula o segundo dígito verificador
        int[] weights2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        sum = 0;
        for (int i = 0; i < 13; i++) {
            sum += Character.getNumericValue(cnpj.charAt(i)) * weights2[i];
        }
        int secondDigit = sum % 11;
        secondDigit = secondDigit < 2 ? 0 : 11 - secondDigit;
        
        // Verifica se os dígitos verificadores estão corretos
        return Character.getNumericValue(cnpj.charAt(12)) == firstDigit &&
               Character.getNumericValue(cnpj.charAt(13)) == secondDigit;
    }
    
    /**
     * Valida se uma data está no formato correto e é válida
     * @param date Data a ser validada
     * @return true se válida
     */
    public static boolean isValidDate(Date date) {
        if (date == null) {
            return false;
        }
        
        Date now = new Date();
        Calendar cal2018 = Calendar.getInstance();
        cal2018.set(2018, 0, 1); // Janeiro de 2018
        
        // Verifica se a data não é futura (conforme regras da API)
        if (date.after(now)) {
            return false;
        }
        
        // Verifica se a data não é anterior a 2018 (conforme regras da API)
        if (date.before(cal2018.getTime())) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Formata um documento removendo caracteres especiais
     * @param document Documento a ser formatado
     * @return Documento apenas com números
     */
    public static String formatDocument(String document) {
        if (document == null) {
            return null;
        }
        return document.replaceAll("\\D", "");
    }
}
