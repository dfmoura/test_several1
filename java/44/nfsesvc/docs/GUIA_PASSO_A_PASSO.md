# Guia passo a passo – NFS-e (gerar, consultar, cancelar)

Este guia explica, de ponta a ponta, como executar o serviço, configurar certificados A1, apontar o endpoint da prefeitura, testar os endpoints REST e solucionar problemas comuns. A implementação foi baseada na documentação e XMLs de exemplo publicados aqui: .

## 1. Pré‑requisitos
- Docker e Docker Compose instalados
- (Opcional) Maven e JDK 17+ se quiser compilar fora do Docker
- Certificado A1 do seu CNPJ em arquivo / (com senha)
- Cadeia de confiança (truststore JKS) com as CAs necessárias para o servidor da prefeitura

## 2. Estrutura do projeto
- Código fonte: 
- Configurações: 
- Templates SOAP: 
- Docker:  e 
- Documentação: 

## 3. Preparar certificados
1) Crie a pasta .
2) Coloque o seu A1 como  (ou renomeie e ajuste a variável ).
3) Coloque a cadeia/autoridades como  (ou renomeie e ajuste a variável ).
4) Tenha em mãos as senhas de ambos.

Observação: não versione esses arquivos. Mantenha‑os fora do repositório público.

## 4. Configurar variáveis no Compose
Arquivo: .

- : URL do WebService SOAP da sua prefeitura/ambiente (homolog/produção) conforme o manual.
- , , : apontam para o seu  dentro do container (ex.: ).
- , , : apontam para o truststore JKS dentro do container (ex.: ).
- O volume  já está configurado para montar a pasta local  em  no container.
- A porta publicada é aleatória (usamos ).

Exemplo (trecho):


## 5. Build e execução
Na raiz do serviço :

- Compilar (opcional, já automatizado na imagem):
[[1;31mERROR[m] The goal you specified requires a project to execute but there is no POM in this directory (/home/diogo/Documents/Git/test_several1/java/44). Please verify you invoked Maven from the correct directory. -> [1m[Help 1][m
[[1;31mERROR[m] 
[[1;31mERROR[m] To see the full stack trace of the errors, re-run Maven with the [1m-e[m switch.
[[1;31mERROR[m] Re-run Maven using the [1m-X[m switch to enable full debug logging.
[[1;31mERROR[m] 
[[1;31mERROR[m] For more information about the errors and possible solutions, please read the following articles:
[[1;31mERROR[m] [1m[Help 1][m http://cwiki.apache.org/confluence/display/MAVEN/MissingProjectException

- Subir com Docker Compose (porta aleatória será publicada):


- Descobrir a porta publicada no host (ex.: ):


- Ver logs (útil para troubleshooting):


## 6. Healthcheck e endpoint raiz
- Health: 
- Raiz com JSON informativo: <HTML>
<HEAD>
<TITLE>Directory /</TITLE>
<BASE HREF="file:/">
</HEAD>
<BODY>
<H1>Directory listing of /</H1>
<UL>
<LI><A HREF="./">./</A>
<LI><A HREF="../">../</A>
<LI><A HREF="bin/">bin/</A>
<LI><A HREF="boot/">boot/</A>
<LI><A HREF="caminho/">caminho/</A>
<LI><A HREF="cdrom/">cdrom/</A>
<LI><A HREF="dev/">dev/</A>
<LI><A HREF="etc/">etc/</A>
<LI><A HREF="home/">home/</A>
<LI><A HREF="lib/">lib/</A>
<LI><A HREF="lib32/">lib32/</A>
<LI><A HREF="lib64/">lib64/</A>
<LI><A HREF="libx32/">libx32/</A>
<LI><A HREF="lost%2Bfound/">lost+found/</A>
<LI><A HREF="media/">media/</A>
<LI><A HREF="mnt/">mnt/</A>
<LI><A HREF="opt/">opt/</A>
<LI><A HREF="proc/">proc/</A>
<LI><A HREF="root/">root/</A>
<LI><A HREF="run/">run/</A>
<LI><A HREF="sbin/">sbin/</A>
<LI><A HREF="snap/">snap/</A>
<LI><A HREF="srv/">srv/</A>
<LI><A HREF="sys/">sys/</A>
<LI><A HREF="tmp/">tmp/</A>
<LI><A HREF="usr/">usr/</A>
<LI><A HREF="var/">var/</A>
</UL>
</BODY>
</HTML>

Exemplo (assumindo porta ):


## 7. Endpoints REST
- Gerar NFS‑e: 
- Consultar NFS‑e: 
- Cancelar NFS‑e: 

Exemplos:


## 8. Ajustes por prefeitura (importante)
Os padrões ABRASF variam por município. A documentação da sua cidade define:
- URL exata do 
- Necessidade de 
- Estrutura dos envelopes, namespaces e XSDs (ver pasta com XMLs de exemplo)
- Códigos de motivo de cancelamento
- Fluxos de emissão síncrona/assíncrona, protocolo, etc.

Referência base com XMLs e manuais: .

## 9. Assinatura XML e TLS mútua
Para produção, comumente é obrigatório:
- Assinar digitalmente o XML (ex.: nós de /) com o seu A1.
- Estabelecer TLS mútua usando o  e o truststore corretos.
- Validar o XML contra o XSD do provedor.

O serviço já está preparado para apontar keystore/truststore via variáveis, mas o exemplo atual envia envelopes simples. Para assinar/parsing detalhado, implemente:
- Assinatura XML (XMLDSig) com a chave do A1
- Parser de respostas SOAP (XML → DTO), tratando códigos de erro
- Cabeçalhos , se exigidos

Se desejar, isso pode ser adicionado no projeto.

## 10. Solução de problemas
- Porta ocupada: usamos porta aleatória. Obtenha a porta: .
- Container sobe e cai: rode  e verifique mensagens (certificados/endpoint).
- Erros de TLS/handshake: confirme caminhos e senhas de  e .
- 404 na raiz: utilize <HTML>
<HEAD>
<TITLE>Directory /</TITLE>
<BASE HREF="file:/">
</HEAD>
<BODY>
<H1>Directory listing of /</H1>
<UL>
<LI><A HREF="./">./</A>
<LI><A HREF="../">../</A>
<LI><A HREF="bin/">bin/</A>
<LI><A HREF="boot/">boot/</A>
<LI><A HREF="caminho/">caminho/</A>
<LI><A HREF="cdrom/">cdrom/</A>
<LI><A HREF="dev/">dev/</A>
<LI><A HREF="etc/">etc/</A>
<LI><A HREF="home/">home/</A>
<LI><A HREF="lib/">lib/</A>
<LI><A HREF="lib32/">lib32/</A>
<LI><A HREF="lib64/">lib64/</A>
<LI><A HREF="libx32/">libx32/</A>
<LI><A HREF="lost%2Bfound/">lost+found/</A>
<LI><A HREF="media/">media/</A>
<LI><A HREF="mnt/">mnt/</A>
<LI><A HREF="opt/">opt/</A>
<LI><A HREF="proc/">proc/</A>
<LI><A HREF="root/">root/</A>
<LI><A HREF="run/">run/</A>
<LI><A HREF="sbin/">sbin/</A>
<LI><A HREF="snap/">snap/</A>
<LI><A HREF="srv/">srv/</A>
<LI><A HREF="sys/">sys/</A>
<LI><A HREF="tmp/">tmp/</A>
<LI><A HREF="usr/">usr/</A>
<LI><A HREF="var/">var/</A>
</UL>
</BODY>
</HTML> (JSON) ou .
- Timeout ao chamar prefeitura: verifique , firewall/proxy e certificados.

## 11. Segurança
- Nunca commit de certificados/senhas.
- Use variáveis de ambiente ou arquivos  privados.
- Restrinja acesso de rede aos serviços de homologação/produção.

## 12. Checklist rápido
- [ ]  e  no lugar
- [ ]  com  e senhas corretas
- [ ] 
- [ ] Porta obtida com 
- [ ] Health OK
- [ ] Testes com , 

---
Dúvidas ou necessidade de adequação ao manual específico da sua prefeitura? Posso ajustar os envelopes, a assinatura XML e o parser das respostas conforme os XSDs e exemplos do provedor.
EOF}
