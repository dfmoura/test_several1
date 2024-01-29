# imagem oficial
FROM python:3.9-slim

# setup diretorio de trabalho para /app
WORKDIR /app

# copiar diretorio atual com conteudo para container /app
COPY . /app

# instalação de dependencias
RUN pip install numpy

# criar o shell script para executar a calculadora
RUN echo '#!/bin/sh\npython bmi_calculator.py' > bmi_calculator.sh
RUN chmod +x bmi_calculator.sh

# setup the variaveis de ambiente para previnir python de buffer no output
ENV PYTHONUNBUFFERED=1

# comando para executar quando o container inicia
CMD ["/bin/sh"]


#execute estes comandos
#docker build -t bmi-calculator .
#docker run -it --rm -v /app bmi-calculator
# ./bmi_calculator.sh
