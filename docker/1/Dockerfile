FROM ubuntu:latest

# Instale as dependências necessárias
RUN apt-get update && apt-get install -y \
    wget \
    openjdk-11-jdk \
    && rm -rf /var/lib/apt/lists/*

# Baixe e instale o Eclipse
RUN wget -O eclipse.tar.gz "https://eclipse.org/downloads/download.php?file=/technology/epp/downloads/release/2022-03/R/eclipse-java-2022-03-R-linux-gtk-x86_64.tar.gz&r=1"

RUN tar -zxvf eclipse.tar.gz -C /opt/
RUN rm eclipse.tar.gz

# Crie um link simbólico para facilitar o acesso
RUN ln -s /opt/eclipse/eclipse /usr/local/bin/eclipse

# Defina o diretório de trabalho padrão
WORKDIR /workspace

# Execute o Eclipse
CMD ["eclipse"]
