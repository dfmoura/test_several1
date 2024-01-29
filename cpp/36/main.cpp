
#include <bits/stdc++.h>
using namespace std;



int main(){

    map<int,string> mes;

    mes[1]="January";
    mes[2]="February";
    mes[3]="March";
    mes[4]="April";
    mes[5]="May";
    mes[6]="June";
    mes[7]="July";
    mes[8]="August";
    mes[9]="September";
    mes[10]="October";
    mes[11]="November";
    mes[12]="December";

    int id;
    cin>>id;
    

    
        cout << mes[id]<<endl;
    
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

