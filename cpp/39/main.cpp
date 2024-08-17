#include <bits/stdc++.h>
using namespace std;

void longDivision(int dividend, int divisor) {
    if (divisor == 0) {
        cout << "Divisão por zero não é permitida." << endl;
        return;
    }

    int quotient = 0, remainder = 0, tempDividend = dividend;
    vector<int> steps;

    while (tempDividend >= divisor) {
        int temp = divisor;
        int tempQuotient = 1;

        while ((temp << 1) <= tempDividend) {
            temp <<= 1;
            tempQuotient <<= 1;
        }

        tempDividend -= temp;
        quotient += tempQuotient;
        steps.push_back(temp);
    }

    remainder = tempDividend;

    // Print the division process
    cout << "       " << quotient << " r " << remainder << endl;
    cout << "    +";
    for (int i = 0; i < to_string(dividend).length() + 1; i++) cout << "-";
    cout << "---" << endl;
    cout << " " << divisor << " | " << dividend << endl;

    int printedDividend = 0;
    for (int step : steps) {
        cout << string(to_string(printedDividend).length() + 3, ' ') << step << endl;
        printedDividend += step;
        cout << string(to_string(printedDividend).length() + 2, ' ') << printedDividend << endl;
        cout << string(to_string(printedDividend).length() + 2, ' ') << "--" << endl;
    }

    if (remainder != 0) {
        cout << string(to_string(printedDividend).length() + 2, ' ') << remainder << endl;
    }
}

int main() {
    vector<pair<int, int>> inputs = {{22, 4}, {102478, 83}, {3811, 37}, {10, 83}, {0, 0}};

    for (auto [dividend, divisor] : inputs) {
        if (dividend == 0 && divisor == 0) {
            break;
        }

        longDivision(dividend, divisor);
        cout << endl;
    }

    return 0;
}
