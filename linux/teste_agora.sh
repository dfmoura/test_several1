if grep "$var1" "$arquivo1" && grep "$var1" "$arquivo2"
then
   echo 'Ambos os arquivos possuem a palavra.'
else
   echo 'Pelo menos um dos arquivos não possui a palavra.'
fi
