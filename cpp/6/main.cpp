// 1024 https://www.beecrowd.com.br/judge/pt/problems/view/1024

#include <bits/stdc++.h>
using namespace std;

int main()
{
    int n;
    string dados;
    cin >> n;
    getchar();

    for (int i = 0; i < n; i++)
    {
        getline(cin, dados);
        for (int j = 0; j < dados.size(); j++)
        {
            if ((dados[j] >= 65 && dados[j] <= 90) || (dados[j] >= 97 && dados[j] <= 122))
            {
                dados[j] += 3;
            }
        }
        reverse(dados.begin(), dados.end());
        for (int j = 0; j < dados.size(); j++)
        {
            if (j >= dados.size() / 2)
            {
                dados[j] -= 1;
            }
        }
        cout << dados << endl;
    }
}
