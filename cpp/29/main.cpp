
#include <bits/stdc++.h>
using namespace std;



int main(){

    map<string,int> pessoa;
    pessoa.insert({"diogo",60});


    for (auto it: pessoa){
        cout<<it.first <<" "<<it.second<<endl;
    }
}
