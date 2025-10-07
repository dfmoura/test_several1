package br.com.exemplo.nfsesvc.dto;

/**
 * DTOs simples para respostas da API.
 */
public class NfseResponses {
	public record OperacaoResponse(boolean sucesso, String mensagem, String protocolo, String numeroNfse) {}
	public record ConsultaResponse(boolean sucesso, String mensagem, String xml) {}
}
