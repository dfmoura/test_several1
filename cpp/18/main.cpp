// ordenacao // neps // https://neps.academy/br/exercise/400

#include <bits/stdc++.h>
using namespace std;

void mostravetor(vector<int>vet){
    for(auto it: vet){
        cout<<it<<" ";
    }
    cout<<endl;
}


int main(){

    int num;
    vector<int> vet;
    for (int i=0;i<10;i++){
        cin>>num;
        vet.push_back(num);
    }
    sort(vet.begin(),vet.end());
    mostravetor(vet);

    sort(vet.begin(),vet.end(),greater<int>());
    mostravetor(vet);

}

