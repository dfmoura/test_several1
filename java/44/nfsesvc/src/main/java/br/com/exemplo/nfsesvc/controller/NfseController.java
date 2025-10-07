package br.com.exemplo.nfsesvc.controller;

import br.com.exemplo.nfsesvc.dto.NfseRequests.GerarRequest;
import br.com.exemplo.nfsesvc.dto.NfseResponses.OperacaoResponse;
import br.com.exemplo.nfsesvc.dto.NfseResponses.ConsultaResponse;
import br.com.exemplo.nfsesvc.service.NfseService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints REST para gerar, consultar e cancelar NFS-e.
 */
@RestController
@RequestMapping(path = "/api/nfse", produces = MediaType.APPLICATION_JSON_VALUE)
public class NfseController {
	private final NfseService nfseService;

	public NfseController(NfseService nfseService) {
		this.nfseService = nfseService;
	}

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<OperacaoResponse> gerar(@Valid @RequestBody GerarRequest req) {
		var resp = nfseService.gerar(req);
		return ResponseEntity.status(resp.sucesso() ? 201 : 400).body(resp);
	}

	@GetMapping("/{numero}")
	public ResponseEntity<ConsultaResponse> consultar(@PathVariable String numero) {
		var resp = nfseService.consultar(numero);
		return ResponseEntity.status(resp.sucesso() ? 200 : 404).body(resp);
	}

	@DeleteMapping("/{numero}")
	public ResponseEntity<OperacaoResponse> cancelar(@PathVariable String numero, @RequestParam(required = false) String motivo) {
		var resp = nfseService.cancelar(numero, motivo);
		return ResponseEntity.status(resp.sucesso() ? 200 : 400).body(resp);
	}
}
