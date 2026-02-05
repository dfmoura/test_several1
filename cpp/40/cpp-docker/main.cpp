#include <iostream>
#include <string>
#include <cstdlib>
#include <ctime>
using namespace std;

void desenhaBolo() {
    cout << R"(
        ,   ,   ,   ,   ,
       | | | | | | | | | |
     _||||||||||__
    |                     |
    |  🎂  Feliz Aniversário!  🎂  |
    |_______|
    )" << endl;
}

int main() {
    string nome;
    
    cout << "Digite seu nome: ";
    getline(cin, nome);

    desenhaBolo();

    cout << "\nParabéns, " << nome << "! 🎉🎈" << endl;
    cout << "Que seu novo ano seja cheio de alegrias, códigos sem bugs e muitos aprendizados!" << endl;
    cout << "Continue programando e explorando esse mundo incrível da computação!" << endl;

    srand(time(0));
    int velinhas = 1 + rand() % 10;
    cout << "\nVocê ganhou " << velinhas << " velinhas virtuais para apagar! 🕯️" << endl;

    cout << "\nPressione Enter para finalizar...";
    cin.get();
    return 0;
}
