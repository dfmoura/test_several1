#!/bin/bash

# Defina a palavra a ser pesquisada
var1="comida"

# Defina os arquivos onde a pesquisa será realizada
arquivo1="arquivo1.txt"
arquivo2="arquivo2.txt"

# Verifique se a palavra está presente em ambos os arquivos
if grep -q "$var1" "$arquivo1" && grep -q "$var1" "$arquivo2"; then
    echo 'Ambos os arquivos possuem a palavra.'
else
    echo 'Pelo menos um dos arquivos não possui a palavra.'
fi

