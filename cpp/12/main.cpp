// ordenacao 1548

#include <bits/stdc++.h>
using namespace std;

int main(){

    int n,m,nota;
    cin>>n;
    for(int i = 0;i<n;i++){
        cin>>m;
        vector<int> alunos, copiaAlunos;
        for(int i = 0 ;i<m;i++){
            cin>>nota;
            alunos.push_back(nota);
        }
        copiaAlunos = alunos;
        sort(copiaAlunos.begin(),copiaAlunos.end(),greater<int>());

        int qtdmundancas = 0;
        for(int i = 0; i<alunos.size();i++){
            if(alunos[i] != copiaAlunos[i]){
                qtdmundancas++;
            }
        }
        cout<<(m-qtdmundancas)<<endl;
    }
}