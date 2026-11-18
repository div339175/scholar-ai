"""
Curated Prototype Mastery Question Bank
Explicit, curated prototype conceptual questions for verifying independent topic understanding.

NOTE: These are curated prototype assessment items authored specifically for StepCode's
deterministic mastery evaluation layer. They are not external datasets or LLM-generated prompts.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel

class StoredMasteryQuestion(BaseModel):
    question_id: str
    topic: str
    question_text: str
    options: List[str]
    correct_answer: str
    explanation: str
    difficulty: str

MASTERY_QUESTION_BANK: Dict[str, List[StoredMasteryQuestion]] = {
    "Sliding Window": [
        StoredMasteryQuestion(
            question_id="sw_q01",
            topic="Sliding Window",
            question_text=(
                "In a variable-size sliding window problem for finding the longest substring "
                "with at most K distinct characters, when the window condition is violated "
                "(more than K distinct characters), what is the correct invariant to restore validity?"
            ),
            options=[
                "A) Reset the left pointer back to index 0 and increment the right pointer.",
                "B) Increment the left pointer and decrement character frequencies in the frequency map until distinct characters <= K.",
                "C) Shrink both left and right pointers simultaneously until the window length is 0.",
                "D) Break the iteration and return the current max window size.",
            ],
            correct_answer="B",
            explanation=(
                "To maintain the sliding window invariant, the left pointer is incremented to shrink "
                "the window while updating the frequency map until the number of distinct characters is at most K."
            ),
            difficulty="Medium",
        ),
        StoredMasteryQuestion(
            question_id="sw_q02",
            topic="Sliding Window",
            question_text=(
                "What is the amortized time complexity of a standard two-pointer sliding window "
                "over an array of length N where the window expands with the right pointer and contracts with the left pointer?"
            ),
            options=[
                "A) O(N^2) because of the nested while loop contracting the window.",
                "B) O(N log N) due to continuous frequency lookups.",
                "C) O(N) because each element is visited at most twice (once by right, once by left).",
                "D) O(K) where K is the target window size.",
            ],
            correct_answer="C",
            explanation=(
                "Even with a nested while loop to shrink the window, the left and right pointers each advance at most N times, yielding O(N) total amortized time."
            ),
            difficulty="Easy",
        ),
    ],
    "Dynamic Programming": [
        StoredMasteryQuestion(
            question_id="dp_q01",
            topic="Dynamic Programming",
            question_text=(
                "When space-optimizing the 0/1 Knapsack problem from a 2D table dp[i][w] to a 1D array dp[w], "
                "why MUST the capacity loop iterate backwards from W down to weight[i]?"
            ),
            options=[
                "A) To optimize cache locality and reduce memory fragmentation.",
                "B) To ensure each item is considered at most once and prevent values from the current iteration from overwriting previous states prematurely.",
                "C) To allow unbounded inclusion of items with zero weight.",
                "D) Backwards iteration has no algorithmic significance and produces identical results to forward iteration.",
            ],
            correct_answer="B",
            explanation=(
                "Iterating backwards ensures that when computing dp[w], dp[w - weight[i]] represents the state from the previous item (i-1), enforcing the 0/1 (at most once) constraint."
            ),
            difficulty="Medium",
        ),
    ],
    "Recursion": [
        StoredMasteryQuestion(
            question_id="rec_q01",
            topic="Recursion",
            question_text=(
                "In backtracking algorithms (such as Generating Subsets or Permutations), what is the critical "
                "purpose of the 'undo/backtrack' step immediately following the recursive call?"
            ),
            options=[
                "A) To clear the call stack and prevent a StackOverflowError.",
                "B) To restore the shared state so subsequent branches explore candidate solutions from a clean state.",
                "C) To return the base case value directly to the parent function.",
                "D) To convert recursive DFS into iterative BFS.",
            ],
            correct_answer="B",
            explanation=(
                "Because mutable candidates (e.g. current path list) are shared across branches, removing the chosen element upon return restores the state for sibling branches."
            ),
            difficulty="Medium",
        ),
    ],
    "Graph Traversal": [
        StoredMasteryQuestion(
            question_id="graph_q01",
            topic="Graph Traversal",
            question_text=(
                "When detecting a cycle in a directed graph using Depth-First Search (DFS), "
                "which node state indicates the presence of a back-edge and therefore a cycle?"
            ),
            options=[
                "A) The adjacent node is currently in the VISITED/COMPLETED state (post-order processed).",
                "B) The adjacent node has an in-degree of 0.",
                "C) The adjacent node is currently in the VISITING/ACTIVE state in the current recursion stack.",
                "D) The adjacent node has no unvisited neighbors.",
            ],
            correct_answer="C",
            explanation=(
                "In directed graph cycle detection via 3-color DFS, encountering a neighbor that is currently marked VISITING (on the active call stack) signifies a back-edge and a cycle."
            ),
            difficulty="Medium",
        ),
    ],
}

def get_question_by_topic(topic: str, index: int = 0) -> Optional[StoredMasteryQuestion]:
    """Retrieve a curated prototype question for a given topic."""
    questions = MASTERY_QUESTION_BANK.get(topic)
    if not questions:
        # Case-insensitive fallback search
        for t, q_list in MASTERY_QUESTION_BANK.items():
            if t.lower() == topic.lower():
                questions = q_list
                break
    if not questions:
        return None
    return questions[index % len(questions)]

def get_question_by_id(question_id: str) -> Optional[StoredMasteryQuestion]:
    """Find a question across all topics by question_id."""
    for q_list in MASTERY_QUESTION_BANK.values():
        for q in q_list:
            if q.question_id == question_id:
                return q
    return None
