package com.b3.investidor.exception;

/**
 * Exceção personalizada para erros da API da B3
 */
public class B3ApiException extends Exception {
    
    private final int statusCode;
    
    /**
     * Construtor com mensagem
     * @param message Mensagem de erro
     */
    public B3ApiException(String message) {
        super(message);
        this.statusCode = 0;
    }
    
    /**
     * Construtor com mensagem e causa
     * @param message Mensagem de erro
     * @param cause Causa da exceção
     */
    public B3ApiException(String message, Throwable cause) {
        super(message, cause);
        this.statusCode = 0;
    }
    
    /**
     * Construtor com mensagem e código de status HTTP
     * @param message Mensagem de erro
     * @param statusCode Código de status HTTP
     */
    public B3ApiException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
    
    /**
     * Construtor com mensagem, causa e código de status HTTP
     * @param message Mensagem de erro
     * @param cause Causa da exceção
     * @param statusCode Código de status HTTP
     */
    public B3ApiException(String message, Throwable cause, int statusCode) {
        super(message, cause);
        this.statusCode = statusCode;
    }
    
    /**
     * Retorna o código de status HTTP associado ao erro
     * @return Código de status HTTP ou 0 se não aplicável
     */
    public int getStatusCode() {
        return statusCode;
    }
    
    /**
     * Verifica se a exceção está relacionada a um erro de autenticação
     * @return true se for erro de autenticação
     */
    public boolean isAuthenticationError() {
        return statusCode == 401;
    }
    
    /**
     * Verifica se a exceção está relacionada a um erro de autorização
     * @return true se for erro de autorização
     */
    public boolean isAuthorizationError() {
        return statusCode == 403;
    }
    
    /**
     * Verifica se a exceção está relacionada a um recurso não encontrado
     * @return true se for erro de não encontrado
     */
    public boolean isNotFoundError() {
        return statusCode == 404;
    }
    
    /**
     * Verifica se a exceção está relacionada a muitas requisições
     * @return true se for erro de rate limit
     */
    public boolean isRateLimitError() {
        return statusCode == 429;
    }
}
