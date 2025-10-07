package br.com.exemplo.nfsesvc.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Endpoint raiz para facilitar testes manuais.
 */
@RestController
public class HomeController {
	@GetMapping(path = "/", produces = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<Map<String, Object>> root() {
		return ResponseEntity.ok(Map.of(
			"service", "nfsesvc",
			"endpoints", Map.of(
				"health", "/actuator/health",
				"gerar", "POST /api/nfse",
				"consultar", "GET /api/nfse/{numero}",
				"cancelar", "DELETE /api/nfse/{numero}?motivo=..."
			)
		));
	}
}


