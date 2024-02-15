#include <bits/stdc++.h>

using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> hashmap;
        vector<int> result;

        for (int i = 0; i < nums.size(); ++i) {
            int complement = target - nums[i];
            if (hashmap.find(complement) != hashmap.end()) {
                result.push_back(hashmap[complement]);
                result.push_back(i);
                break;
            }
            hashmap[nums[i]] = i;
        }

        return result;
