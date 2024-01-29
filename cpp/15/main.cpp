// ordenacao 2479

#include <bits/stdc++.h>
using namespace std;

int main(){

    int n;
    cin>>n;

        //limpar o buffer
        cin.ignore(numeric_limits<streamsize>::max(), '\n');

    vector<string> palavras;
    for(int i = 0;i<n;i++){
        string palavra;
            getline(cin,palavra);
            palavras.push_back(palavra);



    }
        /*if (comportamento=="-"){
            qtdnaocomportou++;
        }else{
            qtdcomportou++;
        } */

    

    /* sort(crianca.begin(),crianca.end()); */
    
    for(auto it: palavras){
        cout << "String: " << it << " | Character Count: " << it.size() << endl;
    }


/*     for(int j=0;j < crianca.size();j++){
        cout<<crianca[j]<<endl;
    } */

}