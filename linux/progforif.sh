for arquivo in `ls`
do
  if [[ $arquivo == *.sh ]]
  then
     echo -n ....."Arquivo: "; ls $arquivo
  elif [[ $arquivo == *.txt ]]
  then
     echo "....... Conteudo do arquivo $arquivo"
     more $arquivo
  else
     file $arquivo
  fi
done
