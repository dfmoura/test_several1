# Usar uma imagem base do Python
FROM python:3.9-slim

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    xvfb \
    libxi6 \
    libgconf-2-4 \
    default-jdk \
    gnupg2 \
    curl \
    && apt-get clean

# Baixar e instalar o Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
RUN apt-get update && apt-get install -y google-chrome-stable

# Instalar o ChromeDriver
RUN CHROME_DRIVER_VERSION=$(curl -sS chromedriver.storage.googleapis.com/LATEST_RELEASE) && \
    wget -N https://chromedriver.storage.googleapis.com/${CHROME_DRIVER_VERSION}/chromedriver_linux64.zip -P ~ && \
    unzip ~/chromedriver_linux64.zip -d ~ && \
    rm ~/chromedriver_linux64.zip && \
    mv -f ~/chromedriver /usr/local/bin/chromedriver && \
    chown root:root /usr/local/bin/chromedriver && \
    chmod 0755 /usr/local/bin/chromedriver

# Definir variáveis de ambiente para ChromeDriver
ENV CHROME_BIN=/usr/bin/google-chrome
ENV CHROME_DRIVER=/usr/local/bin/chromedriver

# Definir o diretório de trabalho
WORKDIR /app

# Copiar arquivos para o container
COPY requirements.txt requirements.txt
COPY scraper.py scraper.py

# Instalar dependências do Python
RUN pip install --no-cache-dir -r requirements.txt

# Comando para rodar o script
CMD ["python", "scraper.py"]
