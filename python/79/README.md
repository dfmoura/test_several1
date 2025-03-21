# Construir a imagem Docker
docker build -t ofx-to-json-converter .

# Executar o contêiner, montando as pastas de entrada e saída
docker run -v $(pwd)/ofx:/ofx -v $(pwd)/json:/json ofx-to-json-converter