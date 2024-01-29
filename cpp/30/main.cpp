
#include <bits/stdc++.h>
using namespace std;



int main(){

    map<string,int> pessoa;
    
    pessoa.insert({"diogo",60});
    pessoa.insert(make_pair("joao",30));
    pessoa.insert(pair<string,int>("miguel",10));
    pessoa["maria"]=15;

    for (auto it: pessoa){
        cout<<it.first <<" "<<it.second<<endl;
    }
}
