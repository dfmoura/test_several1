// ordenacao 2479

#include <bits/stdc++.h>
using namespace std;

int main(){


    int n,m,x,y,aux,soma1=0,soma2=0, cont1=0,cont2=0;
    float media;
    cin>>n>>m>>x>>y;
    vector<vector<int>> num(n, vector<int>(m,0));
    
    for(int i = 0;i<n;i++){
        for(int j = 0; j< m;j++){
        cin>>aux;
        num[i][j]=aux;
        //num.push_back(aux);
        //soma1 += num[i][y];
        }
    }

    for (int i = 0; i < num.size(); ++i) {
        soma1 += num[x][i];
        cont1++;
    }

        for (int j = 0; j < num.size(); ++j) {
        soma2 += num[j][y];
        cont2++;
    }

    media = static_cast<float>(soma1+soma2)/(cont1+cont2);


/*     cout<<soma1<<" + "<<soma2<<" = "<<soma1+soma2<<endl;
    cout<<cont1<<" + "<<cont2<<" = "<<cont1+cont2<<endl;
 */    
cout<<fixed << setprecision(2)<<media<<endl;

}

