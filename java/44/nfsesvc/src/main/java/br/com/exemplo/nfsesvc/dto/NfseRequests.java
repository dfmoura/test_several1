package br.com.exemplo.nfsesvc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * DTOs de requisições da API em PT-BR (preferência do usuário).
 */
public class NfseRequests {
    public record GerarRequest(
            @NotBlank String cnpjPrestador,
            @NotBlank String inscricaoMunicipal,
            @NotBlank String tomadorCpfCnpj,
            @NotBlank String descricaoServico,
            @NotNull BigDecimal valorServicos,
            String competencia,
            String numeroRps
    ) {}
}


