from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.problem import Problem, CodingTelemetry
from app.schemas.problem import ProblemResponse

router = APIRouter(prefix="/problems", tags=["Problems Catalog"])

PROBLEM_DESCRIPTIONS = {
    # Sliding Window
    "prob_sw_01": "Given an array of positive integers and a number K, find the maximum sum of any contiguous subarray of size K.",
    "prob_sw_02": "Given an array of positive integers and a target sum S, find the length of the smallest contiguous subarray whose sum is greater than or equal to S.",
    "prob_sw_03": "Given a string s, find the length of the longest substring without duplicate characters.",
    "prob_sw_04": "Given an array of characters representing fruits in trees, find the maximum number of fruits you can collect in two baskets.",
    "prob_sw_05": "Given two strings s1 and s2, return true if s2 contains a permutation of s1, or false otherwise.",
    "prob_sw_06": "Given a string and a pattern, find all anagram start indices of the pattern in the string.",
    "prob_sw_07": "Given two strings s and t, return the minimum window substring of s such that every character in t is included in the window.",
    "prob_sw_08": "Given an array nums and sliding window size k, return the max sliding window values at each position.",

    # Dynamic Programming
    "prob_dp_01": "You are climbing a staircase. It takes n steps to reach the top. Each time you can climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    "prob_dp_02": "Given an integer array cost where cost[i] is the cost of ith step, find minimum cost to reach the top floor starting from index 0 or 1.",
    "prob_dp_03": "Given an integer array of coins and an amount, compute the fewest number of coins needed to make up that amount.",
    "prob_dp_04": "Given an integer array nums, return the length of the longest strictly increasing subsequence.",
    "prob_dp_05": "Given weights and values of items, put these items in a knapsack of capacity W to get the maximum total value in the knapsack.",
    "prob_dp_06": "Given an integer array nums, return true if you can partition the array into two subsets with equal sum.",
    "prob_dp_07": "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of dictionary words.",
    "prob_dp_08": "Given an integer array nums representing the amount of money of each house, return the maximum money you can rob without alerting the police in a circular street.",
    "prob_dp_09": "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2.",
    "prob_dp_10": "You are given n balloons, indexed from 0 to n - 1. Burst balloons wisely to maximize coins obtained.",

    # Recursion & Backtracking
    "prob_rec_01": "The Fibonacci numbers form a sequence where each number is the sum of the two preceding ones. Calculate F(n).",
    "prob_rec_02": "Given an integer array nums of unique elements, return all possible subsets (the power set).",
    "prob_rec_03": "Given an array nums of distinct integers, return all the possible permutations.",
    "prob_rec_04": "Given an array of distinct integers candidates and a target, return a list of all unique combinations where the chosen numbers sum to target.",
    "prob_rec_05": "Given a string s, partition s such that every substring of the partition is a palindrome.",
    "prob_rec_06": "Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.",
    "prob_rec_07": "The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other.",
    "prob_rec_08": "Given an m x n board of characters and a list of words from the dictionary, return all words on the board.",

    # Graph Traversal
    "prob_graph_01": "Given edges of a bidirectional graph, determine if there is a valid path between source and destination.",
    "prob_graph_02": "Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands.",
    "prob_graph_03": "You are given an m x n grid containing fresh, rotten, and empty oranges. Return the minimum minutes until no cell has a fresh orange.",
    "prob_graph_04": "There are numCourses you have to take, labeled from 0 to numCourses - 1. Return true if you can finish all courses given prerequisite pairs.",
    "prob_graph_05": "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.",
    "prob_graph_06": "Find all grid coordinates that can flow water to both Pacific and Atlantic oceans.",
    "prob_graph_07": "Given two words (beginWord and endWord) and a dictionary's word list, return the length of the shortest transformation sequence.",
    "prob_graph_08": "Given a sorted list of words in an alien language, return the lexicographical order of characters.",

    # Arrays & Hashing
    "prob_arr_01": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    "prob_arr_02": "Given an integer array nums, return true if any value appears at least twice in the array, and false if every element is distinct.",
    "prob_arr_03": "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
    "prob_arr_04": "Given an array of strings strs, group the anagrams together in any order.",
    "prob_arr_05": "Given an integer array nums and an integer k, return the k most frequent elements.",
    "prob_arr_06": "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all elements of nums except nums[i].",
}

@router.get("", response_model=List[ProblemResponse])
def get_problems(
    topic: Optional[str] = None,
    student_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Returns available catalog problems with descriptions and student-specific solve telemetry.
    """
    query = db.query(Problem)
    if topic:
        query = query.filter(Problem.topic == topic)
    problems = query.all()

    # Load telemetry for this student to calculate real solved and attempts
    telemetry_map = {}
    if student_id:
        events = db.query(CodingTelemetry).filter(CodingTelemetry.student_id == student_id).all()
        for e in events:
            pid = e.problem_id
            if pid not in telemetry_map:
                telemetry_map[pid] = {"solved": False, "attempts": 0}
            telemetry_map[pid]["attempts"] += e.submission_count
            if e.successful:
                telemetry_map[pid]["solved"] = True

    results = []
    for p in problems:
        telem = telemetry_map.get(p.id, {"solved": False, "attempts": 0})
        desc = PROBLEM_DESCRIPTIONS.get(p.id, f"Solve algorithmic problem on {p.topic} with {p.difficulty} difficulty.")
        results.append(ProblemResponse(
            id=p.id,
            title=p.title,
            topic=p.topic,
            difficulty=p.difficulty,
            description=desc,
            solved=telem["solved"],
            attempts=telem["attempts"],
        ))

    return results
