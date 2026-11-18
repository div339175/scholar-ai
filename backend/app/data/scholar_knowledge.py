"""
Curated Prototype Scholar AI Knowledge Base
Deterministic, curated prototype conceptual knowledge items for guided learning.

IMPORTANT ARCHITECTURAL RULES:
1. All items are tagged with source_type = "CURATED_PROTOTYPE".
2. No external datasets, scraping, or LLM-generated assertions.
3. Strictly isolated from the mastery assessment question bank (no question answer keys).
"""

from typing import List, Dict, Optional
from pydantic import BaseModel, ConfigDict

class StoredKnowledgeItem(BaseModel):
    knowledge_id: str
    topic: str
    title: str
    content: str
    difficulty: str
    source_type: str = "CURATED_PROTOTYPE"
    tags: List[str]

    model_config = ConfigDict(from_attributes=True)

SCHOLAR_KNOWLEDGE_BANK: List[StoredKnowledgeItem] = [
    # -----------------------------------------------------------------------
    # Topic 1: Sliding Window
    # -----------------------------------------------------------------------
    StoredKnowledgeItem(
        knowledge_id="sw_k01",
        topic="Sliding Window",
        title="Fixed vs Variable Window Invariants",
        content=(
            "A sliding window operates over contiguous sequences using two pointers. "
            "In fixed-size windows of length K, both left and right pointers advance synchronously "
            "by 1 at each step to maintain a constant window size. In variable-size windows, the right "
            "pointer expands the window until a target condition is met or violated, after which the left "
            "pointer advances to contract the window and restore the required invariant."
        ),
        difficulty="Easy",
        source_type="CURATED_PROTOTYPE",
        tags=["sliding-window", "fixed-window", "variable-window", "two-pointers"],
    ),
    StoredKnowledgeItem(
        knowledge_id="sw_k02",
        topic="Sliding Window",
        title="Window Invariant & Contraction Condition",
        content=(
            "The window invariant defines the validity rule that elements within [left, right] must satisfy "
            "(e.g., at most K distinct elements, or sum <= target). When adding an element at right violates "
            "this invariant, a contraction loop must advance left while updating tracked state until the invariant "
            "is restored. A new candidate solution is recorded only while the invariant is valid."
        ),
        difficulty="Medium",
        source_type="CURATED_PROTOTYPE",
        tags=["sliding-window", "invariant", "pointer-movement", "contraction"],
    ),
    StoredKnowledgeItem(
        knowledge_id="sw_k03",
        topic="Sliding Window",
        title="Frequency Map Synchronization",
        content=(
            "Variable-size sliding window problems that track character or element frequencies require "
            "strict synchronization with pointer movements. When expanding (right++), element frequency is "
            "incremented. When contracting (left++), the outgoing element frequency is decremented, and "
            "removed entirely if its count reaches zero to keep distinct element counters accurate."
        ),
        difficulty="Medium",
        source_type="CURATED_PROTOTYPE",
        tags=["sliding-window", "frequency-map", "hash-table", "state-tracking"],
    ),
    StoredKnowledgeItem(
        knowledge_id="sw_k04",
        topic="Sliding Window",
        title="Amortized O(N) Time Complexity Reasoning",
        content=(
            "Although a sliding window implementation typically contains a while loop nested inside a for loop, "
            "the overall time complexity is amortized O(N). This is because both the left pointer and the right pointer "
            "only move forward from 0 to N. Since each element is visited at most twice (once upon entering the window "
            "and once upon leaving it), the total number of operations is bounded by 2N."
        ),
        difficulty="Easy",
        source_type="CURATED_PROTOTYPE",
        tags=["sliding-window", "complexity", "amortized-analysis", "efficiency"],
    ),

    # -----------------------------------------------------------------------
    # Topic 2: Dynamic Programming
    # -----------------------------------------------------------------------
    StoredKnowledgeItem(
        knowledge_id="dp_k01",
        topic="Dynamic Programming",
        title="State Definition & Optimal Substructure",
        content=(
            "A dynamic programming state represents the minimal set of parameters that uniquely defines "
            "a subproblem without history dependence (the Markov property). Optimal substructure exists when an optimal "
            "solution to a problem contains within it optimal solutions to its subproblems."
        ),
        difficulty="Medium",
        source_type="CURATED_PROTOTYPE",
        tags=["dynamic-programming", "state-definition", "optimal-substructure", "memoization"],
    ),
    StoredKnowledgeItem(
        knowledge_id="dp_k02",
        topic="Dynamic Programming",
        title="State Transitions & Recurrence Relations",
        content=(
            "The state transition defines the mathematical recurrence linking a current state to smaller subproblems. "
            "For example, in 0/1 knapsack, dp[i][w] = max(dp[i-1][w], dp[i-1][w - weight[i]] + value[i]). Every transition "
            "must form a Directed Acyclic Graph (DAG) of dependencies to guarantee correct topological evaluation."
        ),
        difficulty="Medium",
        source_type="CURATED_PROTOTYPE",
        tags=["dynamic-programming", "state-transition", "recurrence", "dag"],
    ),
    StoredKnowledgeItem(
        knowledge_id="dp_k03",
        topic="Dynamic Programming",
        title="Base Cases & Boundary Invariants",
        content=(
            "Base cases provide explicit stopping values for states that cannot be decomposed further. "
            "Missing or incorrect base cases cause off-by-one errors or unintended propagation of sentinel values "
            "(such as 0 or infinity). In tabular DP, base cases must be populated in the table before iterative transitions execute."
        ),
        difficulty="Easy",
        source_type="CURATED_PROTOTYPE",
        tags=["dynamic-programming", "base-case", "initialization", "boundary"],
    ),
    StoredKnowledgeItem(
        knowledge_id="dp_k04",
        topic="Dynamic Programming",
        title="Forward vs Backward Traversal in 1D Space Optimization",
        content=(
            "When compressing a 2D table dp[i][w] into a 1D array dp[w] for 0/1 knapsack, the capacity w must be "
            "traversed backward from capacity down to weight[i]. Backward traversal ensures that dp[w - weight[i]] "
            "represents the value from the previous item (iteration i-1) rather than the current item (iteration i), "
            "preventing an item from being erroneously used more than once."
        ),
        difficulty="Hard",
        source_type="CURATED_PROTOTYPE",
        tags=["dynamic-programming", "knapsack", "space-optimization", "traversal-order"],
    ),

    # -----------------------------------------------------------------------
    # Topic 3: Recursion
    # -----------------------------------------------------------------------
    StoredKnowledgeItem(
        knowledge_id="rec_k01",
        topic="Recursion",
        title="Base Case Identification & Stack Frame Invariants",
        content=(
            "Every recursive function must possess at least one terminating base case that executes without making "
            "further recursive calls. Each invocation creates an independent activation frame on the call stack storing "
            "its own parameters, local variables, and return address. Without a reachable base case, call stack depth "
            "exceeds system memory resulting in a stack overflow."
        ),
        difficulty="Easy",
        source_type="CURATED_PROTOTYPE",
        tags=["recursion", "base-case", "call-stack", "termination"],
    ),
    StoredKnowledgeItem(
        knowledge_id="rec_k02",
        topic="Recursion",
        title="Backtracking & State Restoration",
        content=(
            "Backtracking systematically explores a decision tree by choosing a branch, exploring recursively, "
            "and explicitly undoing (restoring) mutable state modifications before exploring sibling branches. "
            "For example, when generating permutations or path coordinates, any element appended to a current path "
            "must be popped off upon returning so the caller's state remains pure."
        ),
        difficulty="Medium",
        source_type="CURATED_PROTOTYPE",
        tags=["recursion", "backtracking", "state-restoration", "decision-tree"],
    ),
    StoredKnowledgeItem(
        knowledge_id="rec_k03",
        topic="Recursion",
        title="Permutation vs Subset Generation Logic",
        content=(
            "In combinatorial backtracking: Subset generation advances an index pointer forward (start + 1) "
            "to enforce an ordering and avoid duplicate combinations. Permutation generation re-examines all "
            "elements from index 0 on each step, using a boolean visited set or in-place swapping to prevent "
            "re-selecting the same element within the active branch."
        ),
        difficulty="Medium",
        source_type="CURATED_PROTOTYPE",
        tags=["recursion", "permutations", "subsets", "combinatorics"],
    ),

    # -----------------------------------------------------------------------
    # Topic 4: Graph Traversal
    # -----------------------------------------------------------------------
    StoredKnowledgeItem(
        knowledge_id="graph_k01",
        topic="Graph Traversal",
        title="Depth-First Search (DFS) & Call Stack Mechanics",
        content=(
            "DFS explores as deep as possible along each branch before backtracking, utilizing an explicit stack "
            "or the runtime call stack. DFS visits each vertex and edge once in O(V + E) time. It is the natural choice "
            "for connectivity queries, topological sorting, finding connected components, and cycle detection."
        ),
        difficulty="Medium",
        source_type="CURATED_PROTOTYPE",
        tags=["graph-traversal", "dfs", "depth-first-search", "stack"],
    ),
    StoredKnowledgeItem(
        knowledge_id="graph_k02",
        topic="Graph Traversal",
        title="Breadth-First Search (BFS) & Shortest Path in Unweighted Graphs",
        content=(
            "BFS explores vertices in concentric levels using a FIFO queue. In an unweighted graph, the first time "
            "a target vertex is popped from the queue, the path taken is guaranteed to be the shortest path from the start "
            "vertex. Time complexity is O(V + E) with space complexity O(V) to store the queue."
        ),
        difficulty="Medium",
        source_type="CURATED_PROTOTYPE",
        tags=["graph-traversal", "bfs", "breadth-first-search", "shortest-path", "queue"],
    ),
    StoredKnowledgeItem(
        knowledge_id="graph_k03",
        topic="Graph Traversal",
        title="Directed Cycle Detection & 3-Color DFS Reasoning",
        content=(
            "In directed graphs, cycle detection requires distinguishing between a cross-edge and a true back-edge "
            "to an ancestor. The 3-color approach assigns states: 0 (White: unvisited), 1 (Gray: currently in the active "
            "recursion stack), and 2 (Black: completely processed). Encountering a neighbor in state 1 (Gray) confirms "
            "a back-edge and proves the existence of a directed cycle."
        ),
        difficulty="Hard",
        source_type="CURATED_PROTOTYPE",
        tags=["graph-traversal", "cycle-detection", "three-color", "directed-graph", "back-edge"],
    ),
]
