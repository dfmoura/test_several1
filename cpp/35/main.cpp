
#include <bits/stdc++.h>
using namespace std;



int main(){

    map<int,double> lanche;

    lanche[1]=4.0;
    lanche[2]=4.5;
    lanche[3]=5.0;
    lanche[4]=2.0;
    lanche[5]=1.5;


    int sanduba, qtd;
    double total;
    cin>>sanduba>>qtd;
    total = lanche[sanduba]*qtd;

    
        cout <<"Total: R$ "<<fixed<<setprecision(2)<< total<<endl;
    
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
