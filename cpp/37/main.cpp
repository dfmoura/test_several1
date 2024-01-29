#include <bits/stdc++.h>

using namespace std;

int main()
{
    map<string, int> assassino, assasinado;

    map<string, int>::iterator it;

    string assassino1, assasinado2;

    while (cin >> assassino1 >> assasinado2)
    {
        ++assassino[assassino1];
        ++assasinado[assasinado2];
    }
    cout << "HALL OF MURDERERS" << endl;


   
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
