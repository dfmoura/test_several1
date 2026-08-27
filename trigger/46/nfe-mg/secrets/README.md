# Certificados A1 (local / Docker)

No produto NF-e, o certificado **não é global**: cada emitente (tenant)
faz upload do próprio A1 pelo console. Os PFX ficam criptografados no MinIO.

Este diretório é opcional — útil só para um certificado de softhouse
(mTLS de transmissão) ou testes isolados.

1. Copie um `.pfx` como `certificado.pfx` se quiser um fallback de dev.
2. Opcional: `certificado.senha` com a senha em uma linha.
3. Nunca faça commit de PFX, senha ou PEM.
