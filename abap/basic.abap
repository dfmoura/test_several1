REPORT ZTESTE002_1_DIOGO. "Com ASPAS duplas colocamos o comentario na continuação da linha.

* Definicao de variaveis

* Modelo de definicao - DATA [VARIAVEL] TYPE [TIPO DE DADO] LENGTH [TAMANHO] VALUE [VALOR INICIAL].

DATA: V_ALUNO(50)  TYPE C,
      V_IDADE      TYPE I,
      V_NOTA1      TYPE F,
      V_NOTA2      TYPE F,
      V_MEDIA      TYPE F.


V_IDADE = 17.
V_NOTA1 = 8.
V_NOTA2 = 6.


* Declaracao de Constantes
CONSTANTS:
c_maior TYPE i VALUE 18.
WRITE: / 'A maioridade no Brasil é de:', c_maior.

* CALCULO
V_MEDIA = ( V_NOTA1 + V_NOTA2 ) / 2.
WRITE:/ 'A media eh de: ', V_MEDIA.

ZPACOTE_CURSO_ABAP_2_DIOGO_202
BMFK900709