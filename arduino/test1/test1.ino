#include <MD_Parola.h>
#include <MD_MAX72XX.h>
#include <SPI.h>

// Definição dos pinos de controle da matriz
#define MAX_DEVICES 1 // Número de módulos 8x8
#define DATA_PIN 11   // Pino DIN
#define CS_PIN   10   // Pino CS
#define CLK_PIN  13   // Pino CLK

// Inicializa a matriz LED
MD_Parola matriz = MD_Parola(MD_MAX72XX::FC16_HW, DATA_PIN, CLK_PIN, CS_PIN, MAX_DEVICES);

void setup() {
  matriz.begin(); // Inicializa a matriz
  matriz.setIntensity(5); // Ajusta o brilho (0 a 15)
  matriz.displayClear(); // Limpa a tela
}

void loop() {
  if (matriz.displayAnimate()) { 
    matriz.displayText("Oi Andre", PA_CENTER, 100, 500, PA_SCROLL_LEFT, PA_SCROLL_LEFT);
  }
}
