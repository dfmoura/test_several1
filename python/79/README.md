# Construir a imagem Docker
docker build -t ofx-to-json .


# Executar o contêiner, montando as pastas de entrada e saída
docker run -v $(pwd)/ofx:/app/ofx -v $(pwd)/json:/app/json ofx-to-json




