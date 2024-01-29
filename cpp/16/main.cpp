// ordenacao 2479

#include <bits/stdc++.h>
using namespace std;

int main()
{
    int doces, evolui, soma=0,contagem=0;
    cin >> doces;
    vector<int> disponivel;
    for (int i = 0; i < 3; i++)
    {
        cin >> evolui;
        disponivel.push_back(evolui);
    }
    sort(disponivel.begin(), disponivel.end());

    for (int i = 0; i < disponivel.size(); i++)
    {
        soma  += disponivel[i];
        if(soma>doces){ break;}
        contagem++;
    }
    cout<<contagem<<endl;
}