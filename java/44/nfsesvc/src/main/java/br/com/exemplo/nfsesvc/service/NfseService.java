package br.com.exemplo.nfsesvc.service;

import br.com.exemplo.nfsesvc.dto.NfseRequests.GerarRequest;
import br.com.exemplo.nfsesvc.dto.NfseResponses.OperacaoResponse;
import br.com.exemplo.nfsesvc.dto.NfseResponses.ConsultaResponse;

/**
 * Contrato do servico de NFS-e.
 */
public interface NfseService {
	OperacaoResponse gerar(GerarRequest request);
	ConsultaResponse consultar(String numeroNfse);
	OperacaoResponse cancelar(String numeroNfse, String motivo);
}
