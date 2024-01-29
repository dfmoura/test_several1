https://www.beecrowd.com.br/judge/pt/problems/view/1051

#include <bits/stdc++.h>
using namespace std;

int main()
{
    float salario, imposto;
    cin >> salario;

    if ((salario >= 0) && (salario <= 2000))
    {
        cout << "Isento" << endl;
    }
    else if ((salario >= 2000.01) && (salario <= 3000))
    {
        imposto= (salario - 2000.01) * 0.08;
        cout<<"R$ "<<fixed<<setprecision(2)<<imposto<<endl;
    }
    else if ((salario >= 3000.01) && (salario <= 4500))
    {
        imposto = (salario - 3000.01) * 0.18 + ((3000 - 2000.01) * 0.08);
        cout<<"R$ "<<fixed<<setprecision(2)<<imposto<<endl;
    }
    else if (salario > 4500)
    {
        imposto = (salario - 4500) * 0.28 + (4500 - 3000.01) * 0.18 + ((3000 - 2000.01) * 0.08);
        cout<<"R$ "<<fixed<<setprecision(2)<<imposto<<endl;
    }
}