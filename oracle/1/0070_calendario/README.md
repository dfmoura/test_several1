CRIAR UMA TELA ... EM HTML CSS E JS
responsiva e dimensionavel automaticamente para qualquer dispositivo ou tamanho de tela.
de um calendario utilizando a biblioteca fullcalendar


para popular o calendario utilizar o select abaixo populando o campo 'descricao' no label do calendario de acordo com
o intervalo de datas dos campos dtainicio e dtafim de cada registro:

select
cal.dtainicio,
cal.dtafim,
cal.cod_desenv_proj||'|'||nov.codigo||'|'||nov.descricao AS descricao
case when cal.concluido = 'S' then 'Sim' else 'Nao' end concluido
from AD_CALENDINOV cal
INNER JOIN AD_NOVOSPRODUTOS nov ON cal.cod_desenv_proj = nov.nrounico





utilizar como base a biblioteca abaixo:

https://github.com/dfmoura/SankhyaJX

com este codigo:
consultar(query): Realiza consultas SQL. Retorna uma promessa com os resultados da consulta.
/* Consulta ao banco com resposta formatada em JS */
JX.consultar ('SELECT * FROM TGFMAR').then (console.log);
