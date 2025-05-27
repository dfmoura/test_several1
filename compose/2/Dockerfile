# Usa a imagem base que você mencionou
FROM sankhyacloud/plataforma-om-sankhya:sandbox-wildfly-23-standard-eldest

# Copia o .war da sua aplicação para a pasta de deployments do WildFly
COPY app.war /opt/wildfly/standalone/deployments/

# Expõe a porta padrão do WildFly
EXPOSE 8080
