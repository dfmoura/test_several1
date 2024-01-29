// 1047

#include <bits/stdc++.h>
using namespace std;

int main()
{

    int start_hour, start_minute, end_hour, end_minute;

    // Input validation
    cin >> start_hour >> start_minute;
    cin >> end_hour >> end_minute;

    if (start_hour < 0 || start_hour > 23 || start_minute < 0 || start_minute > 59 ||
        end_hour < 0 || end_hour > 23 || end_minute < 0 || end_minute > 59)
    {
        std::cerr << "Invalid input. Please enter valid hours and minutes.\n";
        return 1; // Indicates an error
    }

    int hour_difference, minute_difference;

    if (start_hour <= end_hour)
    {
        hour_difference = end_hour - start_hour;
    }
    else
    {
        hour_difference = 24 - (start_hour - end_hour);
    }

    if (start_minute >= end_minute)
    {
        minute_difference = start_minute - end_minute;
    }
    else
    {
        minute_difference = end_minute - start_minute;
    }

    int total_minutes = hour_difference * 60 + minute_difference;
    int calculated_hours = total_minutes / 60;
    int calculated_minutes = total_minutes % 60;

    std::cout << "The game lasted " << calculated_hours << " hours and " << calculated_minutes << " minutes.\n";

    return 0;

    //cout << "O JOGO DUROU " << hora << " HORA(S) E " << min << " MINUTO(S)" << endl;
}
