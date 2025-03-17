#include <LedControl.h>

// Pinos do Arduino conectados ao MAX7219
#define DATA_IN   11   // pino DIN (Data In)
#define LOAD       10   // pino CS (Chip Select)
#define CLOCK      13   // pino CLK (Clock)
#define MAX_DEVICES 1  // Número de matrizes conectadas

LedControl lc = LedControl(DATA_IN, CLOCK, LOAD, MAX_DEVICES);

// Posições iniciais dos pontos
int currentRowLeft = 0;   // Linha onde o ponto da esquerda vai começar
int currentColLeft = 7;   // Coluna onde o ponto da esquerda vai começar
int currentRowUp = 7;     // Linha onde o ponto de cima vai começar
int currentColUp = 3;     // Coluna onde o ponto de cima vai começar

// Variáveis para controlar o movimento de cascata
int dropDelay = 200; // Intervalo de tempo entre o movimento dos pontos da cascata

void setup() {
  // Inicializa todos os LEDs da matriz para apagados
  for (int i = 0; i < MAX_DEVICES; i++) {
    lc.shutdown(i, false);  // Desativa o modo de desligamento
    lc.setIntensity(i, 8);   // Define a intensidade do brilho (0-15)
    lc.clearDisplay(i);      // Limpa a tela da matriz
  }
}

void loop() {
  // Cascata para o ponto que se move da direita para a esquerda

  // Apaga o LED na posição anterior do ponto que cai da direita para a esquerda
  lc.setLed(0, currentRowLeft, currentColLeft, false);

  // Move o ponto para baixo
  currentRowLeft++;

  // Quando o ponto atingir a última linha, ele volta para a primeira linha
  if (currentRowLeft > 7) {
    currentRowLeft = 0;  // Volta para a primeira linha
  }

  // Acende o novo LED na posição do ponto que se move para a esquerda
  lc.setLed(0, currentRowLeft, currentColLeft, true);

  // Cascata para o ponto que se move de cima para baixo

  // Apaga o LED na posição anterior do ponto que vai para cima
  lc.setLed(0, currentRowUp, currentColUp, false);

  // Move o ponto para cima
  currentRowUp--;

  // Quando o ponto chegar à primeira linha, ele volta para a última linha
  if (currentRowUp < 0) {
    currentRowUp = 7;  // Volta para a última linha
  }

  // Acende o novo LED na posição do ponto que se move para cima
  lc.setLed(0, currentRowUp, currentColUp, true);

  // Delay para controlar a velocidade da cascata
  delay(dropDelay);  // Ajuste o valor para aumentar ou diminuir a velocidade
}
