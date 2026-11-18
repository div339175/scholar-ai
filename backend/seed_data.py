import sys
import os
from datetime import datetime, timedelta, timezone

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models.student import Student, ReadinessSnapshot
from app.models.problem import Problem, CodingTelemetry
from app.models.roadmap import RoadmapNode, NodeType, NodeStatus
from app.models.scholar import ScholarIntervention, MasteryCheck, InterventionTriggerType, InterventionStatus
from app.services.readiness_service import ReadinessService

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_alex = db.query(Student).filter(Student.id == "student_alex").first()
        existing_marcus = db.query(Student).filter(Student.id == "student_marcus").first()
        if existing_alex and existing_marcus:
            print("Database already contains demo students. Skipping re-seed.")
            return

        now = datetime.now(timezone.utc)

        if existing_alex and not existing_marcus:
            _seed_marcus(db, now)
            return

        print("Seeding problems catalog...")
        problems_catalog = [
            # Sliding Window
            Problem(id="prob_sw_01", title="Maximum Sum Subarray of Size K", topic="Sliding Window", difficulty="Easy"),
            Problem(id="prob_sw_02", title="Smallest Subarray With Given Sum", topic="Sliding Window", difficulty="Medium"),
            Problem(id="prob_sw_03", title="Longest Substring Without Repeating Characters", topic="Sliding Window", difficulty="Medium"),
            Problem(id="prob_sw_04", title="Fruit Into Baskets", topic="Sliding Window", difficulty="Medium"),
            Problem(id="prob_sw_05", title="Permutation in String", topic="Sliding Window", difficulty="Medium"),
            Problem(id="prob_sw_06", title="String Anagrams", topic="Sliding Window", difficulty="Hard"),
            Problem(id="prob_sw_07", title="Minimum Window Substring", topic="Sliding Window", difficulty="Hard"),
            Problem(id="prob_sw_08", title="Sliding Window Maximum", topic="Sliding Window", difficulty="Hard"),
            
            # Dynamic Programming
            Problem(id="prob_dp_01", title="Climbing Stairs", topic="Dynamic Programming", difficulty="Easy"),
            Problem(id="prob_dp_02", title="Min Cost Climbing Stairs", topic="Dynamic Programming", difficulty="Easy"),
            Problem(id="prob_dp_03", title="Coin Change", topic="Dynamic Programming", difficulty="Medium"),
            Problem(id="prob_dp_04", title="Longest Increasing Subsequence", topic="Dynamic Programming", difficulty="Medium"),
            Problem(id="prob_dp_05", title="0/1 Knapsack", topic="Dynamic Programming", difficulty="Medium"),
            Problem(id="prob_dp_06", title="Partition Equal Subset Sum", topic="Dynamic Programming", difficulty="Medium"),
            Problem(id="prob_dp_07", title="Word Break", topic="Dynamic Programming", difficulty="Medium"),
            Problem(id="prob_dp_08", title="House Robber II", topic="Dynamic Programming", difficulty="Medium"),
            Problem(id="prob_dp_09", title="Edit Distance", topic="Dynamic Programming", difficulty="Hard"),
            Problem(id="prob_dp_10", title="Burst Balloons", topic="Dynamic Programming", difficulty="Hard"),

            # Recursion & Backtracking
            Problem(id="prob_rec_01", title="Fibonacci Number", topic="Recursion", difficulty="Easy"),
            Problem(id="prob_rec_02", title="Subsets Generation", topic="Recursion", difficulty="Medium"),
            Problem(id="prob_rec_03", title="Permutations", topic="Recursion", difficulty="Medium"),
            Problem(id="prob_rec_04", title="Combination Sum", topic="Recursion", difficulty="Medium"),
            Problem(id="prob_rec_05", title="Palindrome Partitioning", topic="Recursion", difficulty="Medium"),
            Problem(id="prob_rec_06", title="Generate Parentheses", topic="Recursion", difficulty="Medium"),
            Problem(id="prob_rec_07", title="N-Queens", topic="Recursion", difficulty="Hard"),
            Problem(id="prob_rec_08", title="Word Search II", topic="Recursion", difficulty="Hard"),

            # Graph Traversal
            Problem(id="prob_graph_01", title="Find if Path Exists in Graph", topic="Graph Traversal", difficulty="Easy"),
            Problem(id="prob_graph_02", title="Number of Islands", topic="Graph Traversal", difficulty="Medium"),
            Problem(id="prob_graph_03", title="Rotting Oranges (BFS)", topic="Graph Traversal", difficulty="Medium"),
            Problem(id="prob_graph_04", title="Course Schedule (Topological Sort)", topic="Graph Traversal", difficulty="Medium"),
            Problem(id="prob_graph_05", title="Clone Graph", topic="Graph Traversal", difficulty="Medium"),
            Problem(id="prob_graph_06", title="Pacific Atlantic Water Flow", topic="Graph Traversal", difficulty="Medium"),
            Problem(id="prob_graph_07", title="Word Ladder", topic="Graph Traversal", difficulty="Hard"),
            Problem(id="prob_graph_08", title="Alien Dictionary", topic="Graph Traversal", difficulty="Hard"),

            # Arrays & Hash Tables
            Problem(id="prob_arr_01", title="Two Sum", topic="Arrays & Hashing", difficulty="Easy"),
            Problem(id="prob_arr_02", title="Contains Duplicate", topic="Arrays & Hashing", difficulty="Easy"),
            Problem(id="prob_arr_03", title="Valid Anagram", topic="Arrays & Hashing", difficulty="Easy"),
            Problem(id="prob_arr_04", title="Group Anagrams", topic="Arrays & Hashing", difficulty="Medium"),
            Problem(id="prob_arr_05", title="Top K Frequent Elements", topic="Arrays & Hashing", difficulty="Medium"),
            Problem(id="prob_arr_06", title="Product of Array Except Self", topic="Arrays & Hashing", difficulty="Medium"),
        ]
        db.add_all(problems_catalog)
        db.commit()

        # -------------------------------------------------------------
        # DEMO STUDENT 1: Alex Sharma (FALSE PROGRESS CASE)
        # -------------------------------------------------------------
        print("Seeding Student 1: Alex Sharma (False Progress archetype)...")
        now = datetime.now(timezone.utc)
        alex = Student(
            id="student_alex",
            name="Alex Sharma",
            career_goal="Full-Stack Developer",
            weekly_hours=10.0,
            current_streak=12,
            roadmap_completion=72.0,
            created_at=now - timedelta(days=21),
        )
        db.add(alex)
        db.commit()

        # Roadmap for Alex (10 nodes: 7 completed -> 70%+, 1 in progress, 2 locked)
        alex_nodes = [
            RoadmapNode(id="alex_n1", student_id="student_alex", title="Basics of JavaScript & Data Structures", topic="Arrays & Hashing", status=NodeStatus.COMPLETED.value, sequence=1, estimated_minutes=120, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="alex_n2", student_id="student_alex", title="Two Pointers Technique", topic="Arrays & Hashing", status=NodeStatus.COMPLETED.value, sequence=2, estimated_minutes=150, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="alex_n3", student_id="student_alex", title="Sliding Window Patterns", topic="Sliding Window", status=NodeStatus.COMPLETED.value, sequence=3, estimated_minutes=180, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="alex_n4", student_id="student_alex", title="Recursion & Backtracking Foundations", topic="Recursion", status=NodeStatus.COMPLETED.value, sequence=4, estimated_minutes=200, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="alex_n5", student_id="student_alex", title="Dynamic Programming: 1D Memoization", topic="Dynamic Programming", status=NodeStatus.COMPLETED.value, sequence=5, estimated_minutes=240, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="alex_n6", student_id="student_alex", title="Dynamic Programming: 2D State Transitions", topic="Dynamic Programming", status=NodeStatus.COMPLETED.value, sequence=6, estimated_minutes=260, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="alex_n7", student_id="student_alex", title="Breadth-First & Depth-First Search", topic="Graph Traversal", status=NodeStatus.COMPLETED.value, sequence=7, estimated_minutes=240, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="alex_n8", student_id="student_alex", title="Advanced Topological Sorting & Graphs", topic="Graph Traversal", status=NodeStatus.IN_PROGRESS.value, sequence=8, estimated_minutes=300, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="alex_n9", student_id="student_alex", title="Full-Stack REST & Async Microservices", topic="Full-Stack", status=NodeStatus.LOCKED.value, sequence=9, estimated_minutes=360, is_locked=True, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="alex_n10", student_id="student_alex", title="System Design & Capstone Project", topic="Full-Stack", status=NodeStatus.LOCKED.value, sequence=10, estimated_minutes=480, is_locked=True, node_type=NodeType.NORMAL.value),
        ]
        db.add_all(alex_nodes)
        db.commit()

        # Telemetry for Alex: Exactly 40 problems completed
        # Deliberate false-progress signature:
        # - High hint dependency (31 / 40 used >= 2 hints)
        # - Repeated failures (multi-attempt submissions: avg 4.2 attempts before pass)
        # - First-attempt pass rate is only 8 / 40 (20%)
        # - Unusually long duration: 45-75 minutes per problem (2700-4500 seconds)
        alex_telemetry = []
        for i, prob in enumerate(problems_catalog[:40]):
            event_time = now - timedelta(days=12 - (i // 4), hours=(i % 4) * 2)
            
            # First 6 easy problems in Arrays passed relatively easily
            if prob.topic == "Arrays & Hashing":
                first_pass = True if i % 2 == 0 else False
                hints = 0 if first_pass else 1
                subs = 1 if first_pass else 2
                duration = 750
            else:
                # Sliding Window, DP, Recursion, Graph: Heavy hint dependency & trial-and-error
                first_pass = (i % 7 == 0) # Only ~14% first pass
                hints = 0 if first_pass else (2 if i % 3 != 0 else 3)
                subs = 1 if first_pass else (4 if i % 2 == 0 else 6)
                duration = 1200 if first_pass else (2400 + (i * 45) % 1800)

            telem = CodingTelemetry(
                id=f"alex_telem_{i+1:02d}",
                student_id="student_alex",
                problem_id=prob.id,
                topic=prob.topic,
                difficulty=prob.difficulty,
                submission_count=subs,
                successful=True,
                first_attempt_pass=first_pass,
                hints_requested=hints,
                active_coding_duration_seconds=duration,
                timestamp=event_time,
            )
            alex_telemetry.append(telem)

        db.add_all(alex_telemetry)
        db.commit()

        # Pre-seed initial intervention record for Alex to demonstrate schema
        alex_intervention = ScholarIntervention(
            id="interv_alex_01",
            student_id="student_alex",
            trigger_type=InterventionTriggerType.FALSE_PROGRESS_HINT_DEPENDENCY.value,
            topic="Dynamic Programming",
            severity="HIGH",
            reason="High roadmap completion (72%) accompanied by heavy hint usage (77.5%) and multiple retry loops on state transitions.",
            recommended_action="Execute a 2-minute conceptual mastery diagnostic on recurrence relations and insert a remediation node before advanced graphs.",
            status=InterventionStatus.TRIGGERED.value,
            created_at=now - timedelta(hours=3),
        )
        db.add(alex_intervention)
        db.commit()

        alex_check = MasteryCheck(
            id="check_alex_01",
            intervention_id="interv_alex_01",
            question="In the 0/1 Knapsack problem, explain why dp[w] must be traversed backwards when space-optimizing to a 1D array.",
            expected_concept="To ensure each item is considered at most once and prevent using updated values from the current iteration.",
            student_answer=None,
            passed=None,
            score=None,
        )
        db.add(alex_check)
        db.commit()

        # -------------------------------------------------------------
        # DEMO STUDENT 2: Priya Mehta (GENUINE MASTERY CASE)
        # -------------------------------------------------------------
        print("Seeding Student 2: Priya Mehta (Genuine Mastery archetype)...")
        priya = Student(
            id="student_priya",
            name="Priya Mehta",
            career_goal="Full-Stack Developer",
            weekly_hours=10.0,
            current_streak=9,
            roadmap_completion=65.0,
            created_at=now - timedelta(days=18),
        )
        db.add(priya)
        db.commit()

        priya_nodes = [
            RoadmapNode(id="priya_n1", student_id="student_priya", title="Basics of JavaScript & Data Structures", topic="Arrays & Hashing", status=NodeStatus.COMPLETED.value, sequence=1, estimated_minutes=120, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="priya_n2", student_id="student_priya", title="Two Pointers Technique", topic="Arrays & Hashing", status=NodeStatus.COMPLETED.value, sequence=2, estimated_minutes=150, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="priya_n3", student_id="student_priya", title="Sliding Window Patterns", topic="Sliding Window", status=NodeStatus.COMPLETED.value, sequence=3, estimated_minutes=180, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="priya_n4", student_id="student_priya", title="Recursion & Backtracking Foundations", topic="Recursion", status=NodeStatus.COMPLETED.value, sequence=4, estimated_minutes=200, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="priya_n5", student_id="student_priya", title="Dynamic Programming: 1D Memoization", topic="Dynamic Programming", status=NodeStatus.COMPLETED.value, sequence=5, estimated_minutes=240, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="priya_n6", student_id="student_priya", title="Dynamic Programming: 2D State Transitions", topic="Dynamic Programming", status=NodeStatus.COMPLETED.value, sequence=6, estimated_minutes=260, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="priya_n7", student_id="student_priya", title="Breadth-First & Depth-First Search", topic="Graph Traversal", status=NodeStatus.IN_PROGRESS.value, sequence=7, estimated_minutes=240, is_locked=False, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="priya_n8", student_id="student_priya", title="Advanced Topological Sorting & Graphs", topic="Graph Traversal", status=NodeStatus.LOCKED.value, sequence=8, estimated_minutes=300, is_locked=True, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="priya_n9", student_id="student_priya", title="Full-Stack REST & Async Microservices", topic="Full-Stack", status=NodeStatus.LOCKED.value, sequence=9, estimated_minutes=360, is_locked=True, node_type=NodeType.NORMAL.value),
            RoadmapNode(id="priya_n10", student_id="student_priya", title="System Design & Capstone Project", topic="Full-Stack", status=NodeStatus.LOCKED.value, sequence=10, estimated_minutes=480, is_locked=True, node_type=NodeType.NORMAL.value),
        ]
        db.add_all(priya_nodes)
        db.commit()

        # Telemetry for Priya: 35 completed problems
        # Genuine mastery signature:
        # - High first-attempt pass rate: ~85% (30 / 35)
        # - Low hint usage: total 3 hints across all 35 problems
        # - Fast, focused durations: 600-1100 seconds (10-18 minutes)
        # - Low submission count: 1-2 submissions
        priya_telemetry = []
        for i, prob in enumerate(problems_catalog[:35]):
            event_time = now - timedelta(days=9 - (i // 4), hours=(i % 4) * 2)
            first_pass = (i % 6 != 0) # ~85% first-attempt passes
            hints = 0 if first_pass else 1 # max 1 hint only on difficult ones
            subs = 1 if first_pass else 2
            duration = 650 + (i * 20) % 400

            telem = CodingTelemetry(
                id=f"priya_telem_{i+1:02d}",
                student_id="student_priya",
                problem_id=prob.id,
                topic=prob.topic,
                difficulty=prob.difficulty,
                submission_count=subs,
                successful=True,
                first_attempt_pass=first_pass,
                hints_requested=hints,
                active_coding_duration_seconds=duration,
                timestamp=event_time,
            )
            priya_telemetry.append(telem)

        db.add_all(priya_telemetry)
        db.commit()

        # Compute initial readiness snapshots for both
        ReadinessService.get_or_create_readiness(db, "student_alex")
        ReadinessService.get_or_create_readiness(db, "student_priya")

        # Seed Marcus
        _seed_marcus(db, now)

        print("Seed data successfully populated!")
        print("Demo Student 1: Alex Sharma (ID: student_alex) -> False Progress Case")
        print("Demo Student 2: Priya Mehta (ID: student_priya) -> Genuine Mastery Case")
        print("Demo Student 3: Marcus Vance (ID: student_marcus) -> Insufficient Evidence Case")

    finally:
        db.close()

def _seed_marcus(db, now):
    print("Seeding Student 3: Marcus Vance (Insufficient Evidence archetype)...")
    marcus = Student(
        id="student_marcus",
        name="Marcus Vance",
        career_goal="Full-Stack Developer",
        weekly_hours=10.0,
        current_streak=2,
        roadmap_completion=15.0,
        created_at=now - timedelta(days=5),
    )
    db.add(marcus)
    db.commit()

    marcus_nodes = [
        RoadmapNode(id="marcus_n1", student_id="student_marcus", title="Basics of JavaScript & Data Structures", topic="Arrays & Hashing", status=NodeStatus.COMPLETED.value, sequence=1, estimated_minutes=120, is_locked=False, node_type=NodeType.NORMAL.value),
        RoadmapNode(id="marcus_n2", student_id="student_marcus", title="Two Pointers Technique", topic="Arrays & Hashing", status=NodeStatus.IN_PROGRESS.value, sequence=2, estimated_minutes=150, is_locked=False, node_type=NodeType.NORMAL.value),
        RoadmapNode(id="marcus_n3", student_id="student_marcus", title="Sliding Window Patterns", topic="Sliding Window", status=NodeStatus.LOCKED.value, sequence=3, estimated_minutes=180, is_locked=True, node_type=NodeType.NORMAL.value),
        RoadmapNode(id="marcus_n4", student_id="student_marcus", title="Recursion & Backtracking Foundations", topic="Recursion", status=NodeStatus.LOCKED.value, sequence=4, estimated_minutes=200, is_locked=True, node_type=NodeType.NORMAL.value),
        RoadmapNode(id="marcus_n5", student_id="student_marcus", title="Dynamic Programming: 1D Memoization", topic="Dynamic Programming", status=NodeStatus.LOCKED.value, sequence=5, estimated_minutes=240, is_locked=True, node_type=NodeType.NORMAL.value),
        RoadmapNode(id="marcus_n6", student_id="student_marcus", title="Dynamic Programming: 2D State Transitions", topic="Dynamic Programming", status=NodeStatus.LOCKED.value, sequence=6, estimated_minutes=260, is_locked=True, node_type=NodeType.NORMAL.value),
        RoadmapNode(id="marcus_n7", student_id="student_marcus", title="Breadth-First & Depth-First Search", topic="Graph Traversal", status=NodeStatus.LOCKED.value, sequence=7, estimated_minutes=240, is_locked=True, node_type=NodeType.NORMAL.value),
        RoadmapNode(id="marcus_n8", student_id="student_marcus", title="Advanced Topological Sorting & Graphs", topic="Graph Traversal", status=NodeStatus.LOCKED.value, sequence=8, estimated_minutes=300, is_locked=True, node_type=NodeType.NORMAL.value),
        RoadmapNode(id="marcus_n9", student_id="student_marcus", title="Full-Stack REST & Async Microservices", topic="Full-Stack", status=NodeStatus.LOCKED.value, sequence=9, estimated_minutes=360, is_locked=True, node_type=NodeType.NORMAL.value),
        RoadmapNode(id="marcus_n10", student_id="student_marcus", title="System Design & Capstone Project", topic="Full-Stack", status=NodeStatus.LOCKED.value, sequence=10, estimated_minutes=480, is_locked=True, node_type=NodeType.NORMAL.value),
    ]
    db.add_all(marcus_nodes)
    db.commit()

    # Exactly 2 problem events (< 5 threshold)
    marcus_telemetry = [
        CodingTelemetry(
            id="marcus_telem_01",
            student_id="student_marcus",
            problem_id="prob_arr_01",
            topic="Arrays & Hashing",
            difficulty="Easy",
            submission_count=1,
            successful=True,
            first_attempt_pass=True,
            hints_requested=0,
            active_coding_duration_seconds=650,
            timestamp=now - timedelta(days=2),
        ),
        CodingTelemetry(
            id="marcus_telem_02",
            student_id="student_marcus",
            problem_id="prob_arr_02",
            topic="Arrays & Hashing",
            difficulty="Easy",
            submission_count=2,
            successful=True,
            first_attempt_pass=False,
            hints_requested=1,
            active_coding_duration_seconds=850,
            timestamp=now - timedelta(days=1),
        ),
    ]
    db.add_all(marcus_telemetry)
    db.commit()

    ReadinessService.get_or_create_readiness(db, "student_marcus")
    print("Demo Student 3: Marcus Vance (ID: student_marcus) -> Insufficient Evidence Case")

if __name__ == "__main__":
    seed_database()

