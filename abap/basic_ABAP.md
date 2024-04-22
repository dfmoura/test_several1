# Example of basic ABAP



```
se38



REPORT Z_TEST_APPLICATION_DIOGO.

WRITE: 'In today"s fast-paced world, technology continues to revolutionize the way we live and work.'.

WRITE 'Meu segundo programa em ABAP'.
WRITE / 'LINHA EM CIANO' COLOR 1.
WRITE / 'LINHA EM AZULADO' COLOR 4.
WRITE / 'LINHA EM AMARELO' COLOR 3.
WRITE / 'LINHA EM VERMELHO' COLOR 6.
WRITE / 'LINHA EM VERDE' COLOR 5.
WRITE / 'LINHA EM LARANJA' COLOR 7.
WRITE / 'LINHA EM CINZA' COLOR 2.
WRITE / 'LINHA EM LARANJA -- MAS FOI UTILIZAR O INVERSE E O LARANJA FOI PARA FONT' COLOR 7 INVERSE.


* Definiçaõ de Variáveis
* Modelo de Definição  - DATA [VARIAVEL] TYPE [TIPO DE DADO] LENGTH [TAMANHO] VALUE [VALOR INICIAL]
DATA: V_ALUNO(50)  TYPE C,
      V_IDADE      TYPE I,
      V_NOTA1      TYPE F,
      V_NOTA2      TYPE F,
      V_MEDIA      TYPE F.


V_NOTA1 =  8.
V_NOTA2 =  6.

WRITE: / 'Nota 1: ',V_NOTA1, '  Nota 2: ',V_NOTA2.

* CALCULO
V_MEDIA = ( V_NOTA1 + V_NOTA2 ) / 2.
WRITE:/ 'A Media eh de: ',V_MEDIA.


V_IDADE = 17.

* Declaração de constante
CONSTANTS:
  C_MAIOR TYPE I VALUE 18.

WRITE: /'Simone tem ',V_IDADE,' anos'.
WRITE: / 'A maioridade no Brasil eh de: ', C_MAIOR.
WRITE: /.
WRITE: /.


DATA: lv_sum TYPE I VALUE 0.
DATA: lt_numbers TYPE TABLE OF I WITH DEFAULT KEY.

APPEND 1 TO lt_numbers.
APPEND 2 TO lt_numbers.
APPEND 3 TO lt_numbers.
APPEND 4 TO lt_numbers.
APPEND 5 TO lt_numbers.

LOOP AT lt_numbers INTO DATA(lv_number).
  lv_sum = lv_sum + lv_number.
  WRITE: / 'Sum of numbers:', lv_sum.
ENDLOOP.

WRITE: / 'Sum of numbers:', lv_sum.


* Modelo de definicao - DATA [VARIAVEL] TYPE [TIPO DE DADO] LENGTH [TAMANHO] VALUE [VALOR INICIAL].

V_IDADE = '17'.
V_NOTA1 = '8'.
V_NOTA2 = '6'.

* CALCULO
V_MEDIA = ( V_NOTA1 + V_NOTA2 ) / 2.
WRITE:/ 'A media eh de: ', V_MEDIA.

WRITE: 'Meu Segundo Programa ABAP' COLOR 1,
       /'SEGUNDA LINHA EM CIANO'   COLOR 1,
       /'TERCEIRA LINHA EM CINZA'  COLOR 2,
       /'QUARTA LINHA EM AMARELO'  COLOR 3.




* SEMPRE QUE POSSIVEL VERIFIQUE OS TIPOS DE DADOS NA TRANSACAO SE11
* DEBUGANDO O PROGRAMA - CORREÇÃO DE ERROS
DATA: CEP TYPE C LENGTH 9.

DATA: x type i,
      y type i,
      Z type i.

x = 100.
y = 200.
z = x + y.
WRITE: / z.
```