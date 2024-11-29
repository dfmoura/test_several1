#!/bin/bash

# Definindo o caminho do arquivo
ARQUIVO="/home/diogo/Documentos/test_several1/oracle/1/0069_ATUL_FILTRO/306_component__trabalho.xml"

# Definindo o trecho a ser substituído (usei um delimitador diferente)
TRECHO_ANTIGO="(
	X.CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) 
	OR X.CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO) 
	OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' 
	)"

# Definindo o novo trecho
TRECHO_NOVO="PPPPPPPPPPDJJIEJIJIFJIJEIJ8899S88D77G77787S7D"

# Usando um arquivo temporário para a substituição
TEMP_FILE=$(mktemp)

# Usando sed para substituir o trecho no arquivo
sed -e "s|$(echo "$TRECHO_ANTIGO" | sed 's/[&/\]/\\&/g')|$(echo "$TRECHO_NOVO" | sed 's/[&/\]/\\&/g')|g" "$ARQUIVO" > "$TEMP_FILE"

# Verificando se a substituição foi bem-sucedida
if [ $? -eq 0 ]; then
    mv "$TEMP_FILE" "$ARQUIVO"  # Substitui o arquivo original pelo temporário
    echo "Substituição concluída com sucesso."
else
    echo "Erro na substituição."
    rm "$TEMP_FILE"  # Remove o arquivo temporário em caso de erro
fi

