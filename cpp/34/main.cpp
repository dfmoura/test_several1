
#include <bits/stdc++.h>
using namespace std;



int main(){

    map<int,string> ddd;

    ddd[61]="Brasilia";
    ddd[71]="Salvador";
    ddd[11]="Sao Paulo";
    ddd[21]="Rio de Janeiro";
    ddd[32]="Juiz de Fora";
    ddd[19]="Campinas";
    ddd[27]="Vitoria";
    ddd[31]="Belo Horizonte";

    int pesq_ddd;
    cin>>pesq_ddd;

    if(ddd.find(pesq_ddd) != ddd.end()){
        cout << ddd[pesq_ddd]<<endl;
    }else{
        cout<<"DDD nao cadastrado"<<endl;
    }
    
    /*pessoa.insert({"diogo",60});
    pessoa.insert(make_pair("joao",30));
    pessoa.insert(pair<string,int>("miguel",10));
    pessoa["maria"]=15;

    cout<< "O tamanho do map eh: "<< pessoa.size()<<endl;
    
    pessoa.erase("joao");



    for (auto it: pessoa){
        cout<<it.first <<" "<<it.second<<endl;
    }

    /*
    for(auto it = pessoa.begin(); it != pessoa.end(); it++){
        cout << it->first << " " << it->second<<endl;
    }

   if(pessoa.find("diogo") != pessoa.end()){
        cout << pessoa["diogo"]<<endl;
    }else{
        cout<<"Chave inexistente"<<endl;
    }

    if(!pessoa.empty()){
        pessoa.clear();
    }

        for (auto it: pessoa){
        cout<<it.first <<" "<<it.second<<endl;
    }*/

}
