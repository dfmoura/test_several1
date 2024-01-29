// ordenacao 2479

#include <bits/stdc++.h>
using namespace std;

int main(){

    int n,m, qtdcomportou=0,qtdnaocomportou=0;
    string comportamento, nome;
    cin>>n;
    vector<string> crianca;
    for(int i = 0;i<n;i++){
        cin>>comportamento>>nome;
        crianca.push_back(nome);
        /*if (comportamento=="-"){
            qtdnaocomportou++;
        }else{
            qtdcomportou++;
        } */

        qtdcomportou += (comportamento == "-") ? 0 : 1;
        qtdnaocomportou += (comportamento == "-") ? 1 : 0;
    }

    sort(crianca.begin(),crianca.end());
    
    for(auto it: crianca){
        cout << it << endl;
    }


/*     for(int j=0;j < crianca.size();j++){
        cout<<crianca[j]<<endl;
    } */
    cout<<"Se comportaram: "<<qtdcomportou<<" | Nao se comportaram: "<<qtdnaocomportou<<endl;
}