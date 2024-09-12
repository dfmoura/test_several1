echo
echo -n "Informe a palavra= " ; read palavra
echo -n "Informe os arquivos= " ; read arquivos
echo
for busca in $arquivos
do
   echo Procurando em $busca ....
   if grep $palavra  $busca > /dev/null
   then
	echo A palavra $palavra foi encontrada em $busca
   fi
done
echo FIM
