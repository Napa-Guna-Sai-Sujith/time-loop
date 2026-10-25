import json
import os
from backend.models import Question, EventSettings, Organizer, Base
from backend.auth import hash_password
from backend.database import SessionLocal, engine

# Default 6-category rich questions curated for LOOP
QUESTIONS_BANK = [
    # ==================== LEVEL 1 ====================
    # --- Category 1: Mathematics ---
    {
        "custom_id": "MATH-L1-001",
        "level": 1,
        "category": "Mathematics",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "If 3^(x - 1) + 3^(x + 1) = 90, what is the value of x?",
        "options": ["2", "3", "4", "5"],
        "correct_answer": "3",
        "explanation": "3^(x-1) + 3^(x+1) = 3^x(1/3 + 3) = 3^x(10/3) = 90. Therefore, 3^x = 90 * 3 / 10 = 27 = 3^3, so x = 3."
    },
    {
        "custom_id": "MATH-L1-002",
        "level": 1,
        "category": "Mathematics",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "A fair two-digit number is formed using digits {1, 2, 3, 4, 5} without repetition. What is the probability that the number formed is an even number?",
        "options": ["2/5", "3/5", "1/2", "1/4"],
        "correct_answer": "2/5",
        "explanation": "Units digit must be 2 or 4 (2 choices). The tens digit can be any of the remaining 4 digits. Total even numbers = 2 * 4 = 8. Total 2-digit numbers without repetition = 5 * 4 = 20. Probability = 8/20 = 2/5."
    },
    # --- Category 2: Logical Reasoning ---
    {
        "custom_id": "LOGIC-L1-001",
        "level": 1,
        "category": "Logical Reasoning",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Determine the missing term in the sequence:\n7, 13, 25, 49, 97, [ ? ]",
        "options": ["145", "193", "189", "195"],
        "correct_answer": "193",
        "explanation": "Each term follows the rule: next = (current * 2) - 1. 7*2-1=13, 13*2-1=25, 25*2-1=49, 49*2-1=97, 97*2-1=193."
    },
    {
        "custom_id": "LOGIC-L1-002",
        "level": 1,
        "category": "Logical Reasoning",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "In a certain code, 'TEMPORAL' is coded as 'UFNQPSBM'. How is 'CONTINUUM' written in that code?",
        "options": ["DPUOUOVVN", "DPOUJNVVN", "DPOUJOVVN", "DPNUJOVVN"],
        "correct_answer": "DPOUJOVVN",
        "explanation": "Each letter is shifted forward by +1 alphabetical position: C->D, O->P, N->O, T->U, I->J, N->O, U->V, U->V, M->N. Result: DPOUJOVVN."
    },
    # --- Category 3: Aptitude ---
    {
        "custom_id": "APT-L1-001",
        "level": 1,
        "category": "Aptitude",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Pipe A can fill a quantum cooling reservoir in 12 minutes, and Pipe B can empty it in 18 minutes. If both pipes are opened simultaneously, in how many minutes will the empty reservoir be completely filled?",
        "options": ["30 minutes", "36 minutes", "24 minutes", "42 minutes"],
        "correct_answer": "36 minutes",
        "explanation": "Net work per minute = 1/12 - 1/18 = (3 - 2)/36 = 1/36. Therefore, the reservoir fills completely in 36 minutes."
    },
    {
        "custom_id": "APT-L1-002",
        "level": 1,
        "category": "Aptitude",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "A train traveling at 72 km/h crosses a 180-meter long tunnel in 18 seconds. What is the length of the train?",
        "options": ["160 m", "180 m", "200 m", "220 m"],
        "correct_answer": "180 m",
        "explanation": "Speed = 72 * (5/18) = 20 m/s. Total distance covered in 18s = 20 * 18 = 360 m. Length of train = Total distance - Tunnel length = 360 - 180 = 180 m."
    },
    # --- Category 4: Python Coding ---
    {
        "custom_id": "PY-L1-001",
        "level": 1,
        "category": "Python Coding",
        "difficulty": "Intermediate",
        "type": "code_output",
        "question_text": "What is the output of the following Python snippet?",
        "code_snippet": "a = [1, 2, 3]\nb = a\na = a + [4]\nprint(b)",
        "options": ["[1, 2, 3, 4]", "[1, 2, 3]", "AttributeError", "[4]"],
        "correct_answer": "[1, 2, 3]",
        "explanation": "'a = a + [4]' creates a new list object and binds 'a' to it, leaving 'b' referencing the original list [1, 2, 3]. (Unlike a.append(4) or a += [4] which would mutate in-place)."
    },
    {
        "custom_id": "PY-L1-002",
        "level": 1,
        "category": "Python Coding",
        "difficulty": "Intermediate",
        "type": "code_output",
        "question_text": "What will be printed by the following code?",
        "code_snippet": "data = {'x': 10, 'y': 20}\nres = [v for k, v in data.items() if k > 'w']\nprint(sum(res))",
        "options": ["10", "20", "30", "0"],
        "correct_answer": "30",
        "explanation": "Both 'x' > 'w' (True) and 'y' > 'w' (True) lexicographically. So res contains [10, 20], sum(res) = 30."
    },
    # --- Category 5: Debugging ---
    {
        "custom_id": "DBG-L1-001",
        "level": 1,
        "category": "Debugging",
        "difficulty": "Intermediate",
        "type": "debugging",
        "question_text": "Identify the bug in this function intended to reverse a list in-place:",
        "code_snippet": "def reverse_array(arr):\n    n = len(arr)\n    for i in range(n):\n        arr[i], arr[n - 1 - i] = arr[n - 1 - i], arr[i]\n    return arr",
        "options": [
            "IndexError occurs at range(n)",
            "The loop runs to n instead of n // 2, reversing the array twice back to original",
            "Tuple unpacking syntax is invalid in Python",
            "arr is immutable and cannot be swapped"
        ],
        "correct_answer": "The loop runs to n instead of n // 2, reversing the array twice back to original",
        "explanation": "Iterating through the full length n swaps elements twice, restoring the initial order. The loop range must be range(n // 2)."
    },
    {
        "custom_id": "DBG-L1-002",
        "level": 1,
        "category": "Debugging",
        "difficulty": "Intermediate",
        "type": "debugging",
        "question_text": "What is wrong with the following function designed to accumulate item tags?",
        "code_snippet": "def add_tag(tag, tags=[]):\n    tags.append(tag)\n    return tags",
        "options": [
            "Default mutable argument 'tags=[]' retains state across multiple function calls",
            "SyntaxError: tags cannot be initialized to empty brackets",
            "TypeError: append cannot be called on default arguments",
            "tags is re-instantiated on every call correctly with no bug"
        ],
        "correct_answer": "Default mutable argument 'tags=[]' retains state across multiple function calls",
        "explanation": "Default argument expressions in Python are evaluated once when the function definition is executed, leading to a shared list across subsequent invocations."
    },
    # --- Category 6: DSA Concept MCQs ---
    {
        "custom_id": "DSA-L1-001",
        "level": 1,
        "category": "DSA Concept MCQs",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Which data structure is fundamentally used by the compiler/runtime to manage function calls and recursion?",
        "options": ["Queue", "Call Stack", "Binary Heap", "Hash Table"],
        "correct_answer": "Call Stack",
        "explanation": "Function calls utilize a LIFO (Last-In-First-Out) Call Stack to store stack frames, local variables, and return addresses."
    },
    {
        "custom_id": "DSA-L1-002",
        "level": 1,
        "category": "DSA Concept MCQs",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "What is the worst-case time complexity of searching for an element in a balanced Binary Search Tree (e.g. AVL or Red-Black Tree) with N nodes?",
        "options": ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
        "correct_answer": "O(log N)",
        "explanation": "Because balanced BSTs maintain height O(log N), every lookup comparison halves the search space, giving worst-case O(log N) lookup."
    },

    # ==================== LEVEL 2 ====================
    # --- Category 1: Mathematics ---
    {
        "custom_id": "MATH-L2-001",
        "level": 2,
        "category": "Mathematics",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "If log_2(x) + log_4(x) = 6, what is the value of x?",
        "options": ["8", "16", "32", "64"],
        "correct_answer": "16",
        "explanation": "Change base of log_4(x): log_4(x) = log_2(x)/log_2(4) = (1/2)log_2(x). Then log_2(x) + 0.5 log_2(x) = 1.5 log_2(x) = 6. log_2(x) = 4 => x = 2^4 = 16."
    },
    {
        "custom_id": "MATH-L2-002",
        "level": 2,
        "category": "Mathematics",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "What is the remainder when 7^84 is divided by 5?",
        "options": ["1", "2", "3", "4"],
        "correct_answer": "1",
        "explanation": "Powers of 7 modulo 5: 7^1 ≡ 2, 7^2 ≡ 4 ≡ -1, 7^4 ≡ 1 (mod 5). Since 84 is divisible by 4 (84 = 4 * 21), 7^84 ≡ (7^4)^21 ≡ 1^21 ≡ 1 (mod 5)."
    },
    # --- Category 2: Logical Reasoning ---
    {
        "custom_id": "LOGIC-L2-001",
        "level": 2,
        "category": "Logical Reasoning",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Five quantum nodes (A, B, C, D, E) are in a network. A is older than B but younger than C. D is older than C but younger than E. Which node is in the exact median age position?",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "C",
        "explanation": "Ordering by age from oldest to youngest: E > D > C > A > B. The third (median) node is C."
    },
    {
        "custom_id": "LOGIC-L2-002",
        "level": 2,
        "category": "Logical Reasoning",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Find the next alphanumeric token in the series: A1Z, C4X, E9V, G16T, [ ? ]",
        "options": ["I25R", "H25S", "I25S", "J25R"],
        "correct_answer": "I25R",
        "explanation": "First letter: A(+2)->C(+2)->E(+2)->G(+2)->I. Number: 1^2, 2^2, 3^2, 4^2, 5^2=25. Last letter: Z(-2)->X(-2)->V(-2)->T(-2)->R. Combined: I25R."
    },
    # --- Category 3: Aptitude ---
    {
        "custom_id": "APT-L2-001",
        "level": 2,
        "category": "Aptitude",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "A shopkeeper marks an item 40% above cost price and allows a 20% trade discount. What is the actual profit percentage?",
        "options": ["10%", "12%", "15%", "20%"],
        "correct_answer": "12%",
        "explanation": "Let CP = 100. MP = 140. SP = 140 * (1 - 0.20) = 112. Profit = 112 - 100 = 12%."
    },
    {
        "custom_id": "APT-L2-002",
        "level": 2,
        "category": "Aptitude",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "In how many distinct ways can the letters of the word 'TIMELOOP' be rearranged?",
        "options": ["40320", "20160", "10080", "5040"],
        "correct_answer": "20160",
        "explanation": "Word has 8 letters: T, I, M, E, L, O, O, P. Letter 'O' appears twice. Total arrangements = 8! / 2! = 40320 / 2 = 20160."
    },
    # --- Category 4: Python Coding ---
    {
        "custom_id": "PY-L2-001",
        "level": 2,
        "category": "Python Coding",
        "difficulty": "Intermediate",
        "type": "code_output",
        "question_text": "What does this generator expression output?",
        "code_snippet": "gen = (x * 2 for x in range(3))\nprint(list(gen))\nprint(list(gen))",
        "options": [
            "[0, 2, 4] and [0, 2, 4]",
            "[0, 2, 4] and []",
            "[0, 2, 4] and None",
            "StopIteration Error"
        ],
        "correct_answer": "[0, 2, 4] and []",
        "explanation": "Generators are one-time iterators. The first list(gen) exhausts all yielded items; subsequent iterations yield an empty list []."
    },
    {
        "custom_id": "PY-L2-002",
        "level": 2,
        "category": "Python Coding",
        "difficulty": "Intermediate",
        "type": "code_output",
        "question_text": "What will be printed by the following code?",
        "code_snippet": "matrix = [[0] * 3] * 3\nmatrix[0][0] = 7\nprint(matrix[1][0])",
        "options": ["0", "7", "IndexError", "None"],
        "correct_answer": "7",
        "explanation": "Multiplying a list containing a list replicates references to the identical inner list. Modifying matrix[0][0] modifies that same list shared across all rows."
    },
    # --- Category 5: Debugging ---
    {
        "custom_id": "DBG-L2-001",
        "level": 2,
        "category": "Debugging",
        "difficulty": "Intermediate",
        "type": "debugging",
        "question_text": "What causes an infinite loop in this binary search implementation?",
        "code_snippet": "def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid\n        else:\n            high = mid - 1\n    return -1",
        "options": [
            "low = mid should be low = mid + 1",
            "high = mid - 1 should be high = mid",
            "mid calculation causes integer overflow in Python",
            "while condition should be low < high"
        ],
        "correct_answer": "low = mid should be low = mid + 1",
        "explanation": "Setting 'low = mid' when low and high differ by 1 fails to narrow the search interval, trapping execution in an infinite loop. It must be 'low = mid + 1'."
    },
    {
        "custom_id": "DBG-L2-002",
        "level": 2,
        "category": "Debugging",
        "difficulty": "Intermediate",
        "type": "debugging",
        "question_text": "Why does this dictionary comprehension fail or produce unexpected results?",
        "code_snippet": "keys = ['a', 'b', 'c']\nd = {k: v for k in keys for v in range(2)}",
        "options": [
            "Syntax error in dictionary comprehension",
            "Keys are overwritten so each key ends up mapped only to the last value (1)",
            "range(2) cannot be nested inside a comprehension",
            "d will contain 6 unique keys"
        ],
        "correct_answer": "Keys are overwritten so each key ends up mapped only to the last value (1)",
        "explanation": "The inner loop runs for v=0, then v=1 for each key, overwriting the dictionary entry so every key maps to 1."
    },
    # --- Category 6: DSA Concept MCQs ---
    {
        "custom_id": "DSA-L2-001",
        "level": 2,
        "category": "DSA Concept MCQs",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "What is the auxiliary space complexity of QuickSort in the average case using recursive implementation?",
        "options": ["O(1)", "O(log N)", "O(N)", "O(N^2)"],
        "correct_answer": "O(log N)",
        "explanation": "Average recursive depth of QuickSort partition call stack is O(log N). In worst case it can degrade to O(N)."
    },
    {
        "custom_id": "DSA-L2-002",
        "level": 2,
        "category": "DSA Concept MCQs",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Which algorithm is used to detect a cycle in a singly linked list in O(1) auxiliary space?",
        "options": ["Kruskal's Algorithm", "Floyd's Tortoise and Hare", "Dijkstra's Algorithm", "Kadane's Algorithm"],
        "correct_answer": "Floyd's Tortoise and Hare",
        "explanation": "Floyd's Cycle-Finding algorithm uses two pointers moving at different speeds (1 step and 2 steps) to detect loops in O(N) time and O(1) space."
    },

    # ==================== LEVEL 3 ====================
    # --- Category 1: Mathematics ---
    {
        "custom_id": "MATH-L3-001",
        "level": 3,
        "category": "Mathematics",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Find the sum of all multiples of 4 between 20 and 120 (inclusive).",
        "options": ["1820", "1680", "1750", "1840"],
        "correct_answer": "1820",
        "explanation": "First term a = 20, common difference d = 4, last term l = 120. Number of terms n = (120 - 20)/4 + 1 = 26. Sum = (n/2)*(a + l) = 13 * 140 = 1820."
    },
    {
        "custom_id": "MATH-L3-002",
        "level": 3,
        "category": "Mathematics",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "If a quadratic equation x^2 - px + q = 0 has roots whose sum is 7 and product is 12, what are the roots?",
        "options": ["2 and 5", "3 and 4", "1 and 12", "-3 and -4"],
        "correct_answer": "3 and 4",
        "explanation": "Roots r1 + r2 = p = 7 and r1 * r2 = q = 12. Factors of 12 that add to 7 are 3 and 4."
    },
    # --- Category 2: Logical Reasoning ---
    {
        "custom_id": "LOGIC-L3-001",
        "level": 3,
        "category": "Logical Reasoning",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Statements:\n1. All quantum cores are stable.\n2. No stable system is volatile.\nConclusion:\nWhich deduction is strictly true?",
        "options": [
            "No quantum core is volatile",
            "All volatile systems are quantum cores",
            "Some quantum cores are volatile",
            "All stable systems are quantum cores"
        ],
        "correct_answer": "No quantum core is volatile",
        "explanation": "Since all cores are in the set of stable systems, and stable systems have zero overlap with volatile systems, no core can be volatile."
    },
    {
        "custom_id": "LOGIC-L3-002",
        "level": 3,
        "category": "Logical Reasoning",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Pointing to a photograph of a scientist, Elena says: 'His sister's father is the only son of my grandfather.' How is Elena related to the scientist?",
        "options": ["Mother", "Sister", "Daughter", "Aunt"],
        "correct_answer": "Sister",
        "explanation": "Only son of grandfather = Elena's father. His sister's father = the scientist's father. So both share the same father, meaning Elena is his sister."
    },
    # --- Category 3: Aptitude ---
    {
        "custom_id": "APT-L3-001",
        "level": 3,
        "category": "Aptitude",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "A sum of money doubles itself in 5 years under compound interest compounded annually. In how many years will it become 8 times its initial value?",
        "options": ["10 years", "15 years", "20 years", "25 years"],
        "correct_answer": "15 years",
        "explanation": "Under compound interest, if money becomes 2x in 5 years, it becomes 2^3 = 8x in 3 * 5 = 15 years."
    },
    {
        "custom_id": "APT-L3-002",
        "level": 3,
        "category": "Aptitude",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "A and B can complete a project in 20 days and 30 days respectively. If they work together for 6 days and then A leaves, in how many more days will B finish the remaining work?",
        "options": ["12 days", "15 days", "18 days", "21 days"],
        "correct_answer": "15 days",
        "explanation": "Work done by (A + B) in 1 day = 1/20 + 1/30 = 5/60 = 1/12. In 6 days, work completed = 6/12 = 1/2. Remaining work = 1/2. B does 1/30 per day, so days for B = (1/2) / (1/30) = 15 days."
    },
    # --- Category 4: Python Coding ---
    {
        "custom_id": "PY-L3-001",
        "level": 3,
        "category": "Python Coding",
        "difficulty": "Intermediate",
        "type": "code_output",
        "question_text": "What will be printed when executing the following snippet?",
        "code_snippet": "def func(x, y=[]):\n    y.append(x)\n    return y\n\nprint(func(1))\nprint(func(2, []))\nprint(func(3))",
        "options": [
            "[1], [2], [3]",
            "[1], [2], [1, 3]",
            "[1], [1, 2], [1, 2, 3]",
            "[1], [2], [2, 3]"
        ],
        "correct_answer": "[1], [2], [1, 3]",
        "explanation": "The second call passes a brand-new explicit list [], not the default. The third call reuses the default list where 1 was appended, becoming [1, 3]."
    },
    {
        "custom_id": "PY-L3-002",
        "level": 3,
        "category": "Python Coding",
        "difficulty": "Intermediate",
        "type": "code_output",
        "question_text": "What is the output of the following dictionary lookup?",
        "code_snippet": "d = {}\nd[1] = 'A'\nd[1.0] = 'B'\nd[True] = 'C'\nprint(len(d), d[1])",
        "options": ["3 A", "1 C", "2 B", "3 C"],
        "correct_answer": "1 C",
        "explanation": "In Python, hash(1) == hash(1.0) == hash(True) and 1 == 1.0 == True. Thus, they all resolve to the same key entry, with 'C' overwriting previous values."
    },
    # --- Category 5: Debugging ---
    {
        "custom_id": "DBG-L3-001",
        "level": 3,
        "category": "Debugging",
        "difficulty": "Intermediate",
        "type": "debugging",
        "question_text": "Identify the cause of the RecursionError in this Fibonacci implementation:",
        "code_snippet": "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n) + fib(n - 1)",
        "options": [
            "fib(n) causes infinite self-recursion without decreasing n",
            "Base condition n <= 1 is wrong",
            "fib should return a list instead of int",
            "Recursion limit cannot exceed 10 in Python"
        ],
        "correct_answer": "fib(n) causes infinite self-recursion without decreasing n",
        "explanation": "The recursive expression calls 'fib(n)' instead of 'fib(n - 1) + fib(n - 2)', invoking itself with the exact same argument indefinitely."
    },
    {
        "custom_id": "DBG-L3-002",
        "level": 3,
        "category": "Debugging",
        "difficulty": "Intermediate",
        "type": "debugging",
        "question_text": "What logical bug exists in this list filtering loop?",
        "code_snippet": "nums = [1, 2, 3, 4, 5, 6]\nfor n in nums:\n    if n % 2 == 0:\n        nums.remove(n)\nprint(nums)",
        "options": [
            "Modifying a list while iterating over it causes the iterator to skip adjacent elements",
            "remove() method only works with strings",
            "ZeroDivisionError occurs",
            "n is a copy and does not affect nums"
        ],
        "correct_answer": "Modifying a list while iterating over it causes the iterator to skip adjacent elements",
        "explanation": "Removing an item in-place shifts remaining elements to the left, causing the iterator's index pointer to skip the item immediately following the removed one."
    },
    # --- Category 6: DSA Concept MCQs ---
    {
        "custom_id": "DSA-L3-001",
        "level": 3,
        "category": "DSA Concept MCQs",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "In a min-heap with N elements, what is the time complexity to insert a new element and re-heapify?",
        "options": ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
        "correct_answer": "O(log N)",
        "explanation": "Insertion places the element at the tree leaf and bubbles it up along the path to root, traversing at most tree height O(log N)."
    },
    {
        "custom_id": "DSA-L3-002",
        "level": 3,
        "category": "DSA Concept MCQs",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Which algorithm is optimal for finding the shortest path in a weighted graph with non-negative edge weights?",
        "options": ["Dijkstra's Algorithm", "Bellman-Ford Algorithm", "Floyd-Warshall", "Breadth-First Search"],
        "correct_answer": "Dijkstra's Algorithm",
        "explanation": "Dijkstra's algorithm solves single-source shortest paths in O((V + E) log V) with a priority queue when all weights are non-negative."
    },

    # ==================== LEVEL 4 ====================
    # --- Category 1: Mathematics ---
    {
        "custom_id": "MATH-L4-001",
        "level": 4,
        "category": "Mathematics",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "If a matrix A has eigenvalues λ1 = 3 and λ2 = 5, what is the determinant of matrix A^2?",
        "options": ["15", "64", "225", "125"],
        "correct_answer": "225",
        "explanation": "The determinant of A is the product of its eigenvalues: det(A) = 3 * 5 = 15. Then det(A^2) = (det(A))^2 = 15^2 = 225."
    },
    {
        "custom_id": "MATH-L4-002",
        "level": 4,
        "category": "Mathematics",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "What is the unit digit of the expression 3^65 * 6^59 * 7^71?",
        "options": ["2", "4", "6", "8"],
        "correct_answer": "4",
        "explanation": "Powers of 3 cyclicity 4: 65 mod 4 = 1 -> unit digit 3. Powers of 6 always end in 6. Powers of 7 cyclicity 4: 71 mod 4 = 3 -> 7^3 ends in 3. Product: 3 * 6 * 3 = 54 -> unit digit is 4."
    },
    # --- Category 2: Logical Reasoning ---
    {
        "custom_id": "LOGIC-L4-001",
        "level": 4,
        "category": "Logical Reasoning",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Six quantum engineers (P, Q, R, S, T, U) sit around a circular table facing center. P is opposite S. R is between P and Q. T is to the immediate right of S. Who is opposite R?",
        "options": ["T", "U", "Q", "P"],
        "correct_answer": "T",
        "explanation": "Plotting positions 1-6 clockwise: P at 1, S at 4. R is between P and Q (R at 2, Q at 3). T is immediate right of S (anticlockwise facing center -> position 5). U at 6. Opposite position to 2 (R) is 5 (T)."
    },
    {
        "custom_id": "LOGIC-L4-002",
        "level": 4,
        "category": "Logical Reasoning",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "If 'QUANTUM' is coded as 'OWCLVWO' (+2, -2 pattern), what is the decoded original word for 'EQTGGV'?",
        "options": ["CORRECT", "SYSTEM", "VECTOR", "ENERGY"],
        "correct_answer": "CORRECT",
        "explanation": "Reverse mapping: alternating -2 and +2 shifts on 'EQTGGV' reconstructs 'CORRECT'."
    },
    # --- Category 3: Aptitude ---
    {
        "custom_id": "APT-L4-001",
        "level": 4,
        "category": "Aptitude",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "A container contains 80 liters of pure milk. 8 liters are extracted and replaced with water. This process is repeated one more time. What is the final volume of pure milk?",
        "options": ["64.8 liters", "65.2 liters", "63.6 liters", "66.0 liters"],
        "correct_answer": "64.8 liters",
        "explanation": "Formula: Initial * (1 - x/V)^n = 80 * (1 - 8/80)^2 = 80 * (0.9)^2 = 80 * 0.81 = 64.8 liters."
    },
    {
        "custom_id": "APT-L4-002",
        "level": 4,
        "category": "Aptitude",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "In a race of 1000m, Runner A beats Runner B by 100m or 10 seconds. What is Runner A's speed?",
        "options": ["9 m/s", "10 m/s", "11.11 m/s", "12 m/s"],
        "correct_answer": "11.11 m/s",
        "explanation": "B covers 100m in 10s, so B's speed = 10 m/s. B takes 1000/10 = 100s for 1000m. Since A beats B by 10s, A takes 90s. A's speed = 1000 / 90 = 11.11 m/s."
    },
    # --- Category 4: Python Coding ---
    {
        "custom_id": "PY-L4-001",
        "level": 4,
        "category": "Python Coding",
        "difficulty": "Intermediate",
        "type": "code_output",
        "question_text": "What does the following closure snippet output?",
        "code_snippet": "funcs = [lambda x, i=i: x + i for i in range(3)]\nprint([f(10) for f in funcs])",
        "options": ["[10, 11, 12]", "[10, 10, 10]", "[12, 12, 12]", "[13, 13, 13]"],
        "correct_answer": "[10, 11, 12]",
        "explanation": "Using default argument 'i=i' binds the loop variable value at definition time instead of late-binding reference, producing 10+0=10, 10+1=11, 10+2=12."
    },
    {
        "custom_id": "PY-L4-002",
        "level": 4,
        "category": "Python Coding",
        "difficulty": "Intermediate",
        "type": "code_output",
        "question_text": "What will be printed by the following code?",
        "code_snippet": "def trace(func):\n    def wrapper(*args):\n        return func(*args) * 2\n    return wrapper\n\n@trace\ndef compute(a, b):\n    return a + b\n\nprint(compute(3, 4))",
        "options": ["7", "14", "Error", "None"],
        "correct_answer": "14",
        "explanation": "The decorator wrapper calls compute(3, 4) which returns 7, then multiplies by 2, returning 14."
    },
    # --- Category 5: Debugging ---
    {
        "custom_id": "DBG-L4-001",
        "level": 4,
        "category": "Debugging",
        "difficulty": "Intermediate",
        "type": "debugging",
        "question_text": "What concurrency/threading issue exists in this counter snippet without synchronization?",
        "code_snippet": "import threading\ncounter = 0\ndef increment():\n    global counter\n    for _ in range(100000):\n        counter += 1",
        "options": [
            "Race condition due to non-atomic += bytecode operations across threads",
            "Deadlock occurs automatically",
            "GIL prevents multiple threads from running at all",
            "TypeError on global variable declaration"
        ],
        "correct_answer": "Race condition due to non-atomic += bytecode operations across threads",
        "explanation": "In Python bytecode, counter += 1 involves LOAD_GLOBAL, BINARY_ADD, and STORE_GLOBAL. Thread context switches between these instructions cause lost updates."
    },
    {
        "custom_id": "DBG-L4-002",
        "level": 4,
        "category": "Debugging",
        "difficulty": "Intermediate",
        "type": "debugging",
        "question_text": "Why does this JSON serialization throw a TypeError?",
        "code_snippet": "import json\ndata = {'timestamp': set([1, 2, 3])}\njson.dumps(data)",
        "options": [
            "JSON standard has no native representation for Python 'set' objects",
            "Dictionary keys must be integers",
            "dumps() requires an open file pointer",
            "Memory limit exceeded"
        ],
        "correct_answer": "JSON standard has no native representation for Python 'set' objects",
        "explanation": "Standard JSON does not support sets. A custom serializer or converting to list(set) is required."
    },
    # --- Category 6: DSA Concept MCQs ---
    {
        "custom_id": "DSA-L4-001",
        "level": 4,
        "category": "DSA Concept MCQs",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Which technique achieves O(1) time complexity for range sum queries on an immutable 1D array?",
        "options": ["Prefix Sum Array", "Segment Tree", "Binary Indexed Tree (Fenwick)", "Two Pointers"],
        "correct_answer": "Prefix Sum Array",
        "explanation": "With precomputed prefix sums P where P[i] is sum up to i, any range sum [L, R] is calculated in O(1) via P[R] - P[L - 1]."
    },
    {
        "custom_id": "DSA-L4-002",
        "level": 4,
        "category": "DSA Concept MCQs",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "What is the amortized time complexity of inserting into a Dynamic Array (e.g. Python list / C++ std::vector) with doubling growth strategy?",
        "options": ["O(1)", "O(log N)", "O(N)", "O(N^2)"],
        "correct_answer": "O(1)",
        "explanation": "Although reallocation takes O(N), it happens exponentially infrequently, yielding an aggregate amortized cost of O(1) per append."
    },

    # ==================== LEVEL 5 (THE FINAL) ====================
    # --- Category 1: Mathematics ---
    {
        "custom_id": "MATH-L5-001",
        "level": 5,
        "category": "Mathematics",
        "difficulty": "Hard",
        "type": "mcq",
        "question_text": "A quantum system transitions between 3 states with transition probability matrix P where rows sum to 1. If row 1 is [0.5, 0.5, 0], row 2 is [0, 0.5, 0.5], and row 3 is [0.5, 0, 0.5], what is the stationary distribution vector?",
        "options": ["[1/3, 1/3, 1/3]", "[1/2, 1/4, 1/4]", "[2/5, 2/5, 1/5]", "[1/4, 1/2, 1/4]"],
        "correct_answer": "[1/3, 1/3, 1/3]",
        "explanation": "By symmetry and column sums being 1 (doubly stochastic matrix), the unique stationary distribution π satisfying πP = π is [1/3, 1/3, 1/3]."
    },
    # --- Category 2: Logical Reasoning ---
    {
        "custom_id": "LOGIC-L5-001",
        "level": 5,
        "category": "Logical Reasoning",
        "difficulty": "Hard",
        "type": "mcq",
        "question_text": "You are at a fork in the temporal dimension. One path leads to safety, the other to loop collapse. Two guardians guard the fork: one always tells the truth, the other always lies. You can ask ONE guardian ONE question. Which question guarantees the safe path?",
        "options": [
            "'Which path is safe?'",
            "'Would the other guardian tell me that the left path is safe?'",
            "'Are you telling the truth?'",
            "'Is the right path dangerous?'"
        ],
        "correct_answer": "'Would the other guardian tell me that the left path is safe?'",
        "explanation": "Both guardians will consistently answer with the lie (True * False = False; False * True = False), allowing you to invert their answer to find safety."
    },
    # --- Category 3: Aptitude ---
    {
        "custom_id": "APT-L5-001",
        "level": 5,
        "category": "Aptitude",
        "difficulty": "Hard",
        "type": "mcq",
        "question_text": "Three clocks A, B, and C started together at 12:00 PM. Clock A gains 2 minutes per hour, Clock B loses 3 minutes per hour, and Clock C keeps correct time. When Clock A shows 6:12 PM, what time does Clock B show?",
        "options": ["5:42 PM", "5:45 PM", "5:30 PM", "5:48 PM"],
        "correct_answer": "5:42 PM",
        "explanation": "Clock A runs at 62 min/hr. Elapsed time for A = 6 hrs 12 min = 372 mins. True time passed = 372 / 62 = 6 real hours. Since Clock B loses 3 min/hr, in 6 hours it loses 18 minutes. 6:00 PM - 18 mins = 5:42 PM."
    },
    # --- Category 4: Python Coding ---
    {
        "custom_id": "PY-L5-001",
        "level": 5,
        "category": "Python Coding",
        "difficulty": "Hard",
        "type": "code_output",
        "question_text": "What is the result of using a custom metaclass in this snippet?",
        "code_snippet": "class Meta(type):\n    def __new__(cls, name, bases, dct):\n        dct['version'] = 42\n        return super().__new__(cls, name, bases, dct)\n\nclass Core(metaclass=Meta):\n    pass\n\nprint(Core.version)",
        "options": ["42", "AttributeError", "None", "Meta"],
        "correct_answer": "42",
        "explanation": "The metaclass __new__ method intercepts class construction and injects the attribute 'version': 42 into the class namespace dictionary."
    },
    # --- Category 5: Debugging ---
    {
        "custom_id": "DBG-L5-001",
        "level": 5,
        "category": "Debugging",
        "difficulty": "Hard",
        "type": "debugging",
        "question_text": "What is the critical flaw in this custom context manager?",
        "code_snippet": "class SafeLock:\n    def __enter__(self):\n        print('Acquired')\n    def __exit__(self, exc_type, exc_val, exc_tb):\n        print('Released')\n        return False",
        "options": [
            "__enter__ does not return self or a resource, so 'as' binding receives None",
            "__exit__ must return True to suppress all exceptions",
            "__init__ method is missing and mandatory",
            "exc_type parameter is invalid"
        ],
        "correct_answer": "__enter__ does not return self or a resource, so 'as' binding receives None",
        "explanation": "If a user writes 'with SafeLock() as lock:', lock will be None because __enter__ does not explicitly return self."
    },
    # --- Category 6: DSA Concept MCQs ---
    {
        "custom_id": "DSA-L5-001",
        "level": 5,
        "category": "DSA Concept MCQs",
        "difficulty": "Hard",
        "type": "mcq",
        "question_text": "In a Disjoint Set Union (Union-Find) with both Union by Rank and Path Compression, what is the amortized time complexity per find/union operation for N elements?",
        "options": ["O(1)", "O(α(N)) where α is inverse Ackermann", "O(log N)", "O(N)"],
        "correct_answer": "O(α(N)) where α is inverse Ackermann",
        "explanation": "Combining Union by Rank and Path Compression yields O(α(N)) amortized time, practically less than 5 for any physically possible universe value."
    },

    # ==================== LEVEL 1 (Set 3 Additions) ====================
    {
        "custom_id": "MATH-L1-003",
        "level": 1,
        "category": "Mathematics",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "If log_2(x) + log_2(x - 2) = 3, what is the real value of x?",
        "options": ["4", "-2", "6", "8"],
        "correct_answer": "4",
        "explanation": "log_2(x(x-2)) = 3 => x^2 - 2x = 8 => x^2 - 2x - 8 = 0 => (x-4)(x+2)=0. Log requires x > 2, so x = 4."
    },
    {
        "custom_id": "LOGIC-L1-003",
        "level": 1,
        "category": "Logical Reasoning",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Point A is 10m North of Point B. Point C is 10m East of Point B. What is the shortest distance and direction from C to A?",
        "options": ["10√2 m North-West", "10√2 m North-East", "20 m North-West", "10 m South-West"],
        "correct_answer": "10√2 m North-West",
        "explanation": "Shortest distance = √(10^2 + 10^2) = 10√2 m. Moving from C to A is North and West."
    },
    {
        "custom_id": "APT-L1-003",
        "level": 1,
        "category": "Aptitude",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "A sum of money doubles itself in 5 years at simple interest. In how many years will it become four times itself at the same rate?",
        "options": ["15 years", "10 years", "20 years", "12 years"],
        "correct_answer": "15 years",
        "explanation": "Doubling means SI = P in 5 yrs. To become 4 times itself, SI = 3P. Time required = 3 * 5 = 15 years."
    },
    {
        "custom_id": "PY-L1-003",
        "level": 1,
        "category": "Python Coding",
        "difficulty": "Intermediate",
        "type": "code_output",
        "question_text": "What is the output of the following Python expression?",
        "code_snippet": "print(list(filter(lambda x: x % 2 == 0, range(1, 8))))",
        "options": ["[2, 4, 6]", "[1, 3, 5, 7]", "[0, 2, 4, 6]", "[2, 4, 6, 8]"],
        "correct_answer": "[2, 4, 6]",
        "explanation": "range(1, 8) evaluates numbers 1 through 7. The even elements satisfying x % 2 == 0 are [2, 4, 6]."
    },
    {
        "custom_id": "DBG-L1-003",
        "level": 1,
        "category": "Debugging",
        "difficulty": "Intermediate",
        "type": "debugging",
        "question_text": "Identify the bug in this function intended to find the maximum element in a list:",
        "code_snippet": "def get_max(nums):\n    max_val = 0\n    for n in nums:\n        if n > max_val:\n            max_val = n\n    return max_val",
        "options": [
            "Fails for lists containing only negative numbers",
            "Syntax error on line 4",
            "IndexError when nums is empty",
            "max_val must be initialized to 1"
        ],
        "correct_answer": "Fails for lists containing only negative numbers",
        "explanation": "Initializing max_val to 0 causes get_max([-5, -2, -10]) to incorrectly return 0. Should initialize to float('-inf') or nums[0]."
    },
    {
        "custom_id": "DSA-L1-003",
        "level": 1,
        "category": "DSA Concept MCQs",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Which of the following sorting algorithms is NOT stable in its standard textbook implementation?",
        "options": ["Quick Sort", "Merge Sort", "Insertion Sort", "Bubble Sort"],
        "correct_answer": "Quick Sort",
        "explanation": "Standard Quick Sort can swap equal elements across the partition pivot, failing to preserve original order."
    },

    # ==================== LEVEL 2 (Set 3 Additions) ====================
    {
        "custom_id": "MATH-L2-003",
        "level": 2,
        "category": "Mathematics",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Find the sum of the infinite geometric series: 12 + 4 + 4/3 + 4/9 + ...",
        "options": ["18", "16", "24", "15"],
        "correct_answer": "18",
        "explanation": "First term a = 12, common ratio r = 1/3. Sum = a / (1 - r) = 12 / (2/3) = 18."
    },
    {
        "custom_id": "LOGIC-L2-003",
        "level": 2,
        "category": "Logical Reasoning",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "In a row of 40 students, Priya is 15th from the left and Amit is 18th from the right. How many students are seated between Priya and Amit?",
        "options": ["7", "8", "9", "6"],
        "correct_answer": "7",
        "explanation": "Between = Total - (Left + Right) = 40 - (15 + 18) = 40 - 33 = 7."
    },
    {
        "custom_id": "APT-L2-003",
        "level": 2,
        "category": "Aptitude",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "A merchant marks an item 40% above cost price and allows a discount of 25%. What is his overall profit percentage?",
        "options": ["5%", "10%", "15%", "8%"],
        "correct_answer": "5%",
        "explanation": "Let CP = 100 => Marked Price = 140. Selling Price = 140 * 0.75 = 105. Profit = 5%."
    },
    {
        "custom_id": "PY-L2-003",
        "level": 2,
        "category": "Python Coding",
        "difficulty": "Intermediate",
        "type": "code_output",
        "question_text": "What is the output of the following dictionary comprehension?",
        "code_snippet": "keys = ['a', 'b', 'c']\nvals = [1, 2, 3]\nd = {k: v*2 for k, v in zip(keys, vals) if v > 1}\nprint(d)",
        "options": ["{'b': 4, 'c': 6}", "{'a': 2, 'b': 4, 'c': 6}", "{'b': 2, 'c': 3}", "{'c': 6}"],
        "correct_answer": "{'b': 4, 'c': 6}",
        "explanation": "zip pairs: ('a', 1), ('b', 2), ('c', 3). The condition v > 1 filters for 'b' and 'c'. Multiplying by 2 yields {'b': 4, 'c': 6}."
    },
    {
        "custom_id": "DBG-L2-003",
        "level": 2,
        "category": "Debugging",
        "difficulty": "Intermediate",
        "type": "debugging",
        "question_text": "Why does this binary search implementation produce an infinite loop when target is greater than mid?",
        "code_snippet": "def bsearch(arr, target):\n    low, high = 0, len(arr) - 1\n    while low < high:\n        mid = (low + high) // 2\n        if arr[mid] < target:\n            low = mid\n        else:\n            high = mid\n    return low",
        "options": [
            "low = mid does not advance when low and high differ by 1",
            "arr is not indexed from zero",
            "high should start at len(arr)",
            "Division by zero occurs"
        ],
        "correct_answer": "low = mid does not advance when low and high differ by 1",
        "explanation": "When high = low + 1, mid = (low + low + 1) // 2 = low. Setting low = mid keeps low identical, freezing the loop. It must be low = mid + 1."
    },
    {
        "custom_id": "DSA-L2-003",
        "level": 2,
        "category": "DSA Concept MCQs",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "What is the minimum number of standard FIFO queues required to implement a LIFO Stack?",
        "options": ["2", "1", "3", "4"],
        "correct_answer": "2",
        "explanation": "Two FIFO queues are needed in classic data structures to achieve LIFO push and pop semantics."
    },

    # ==================== LEVEL 3 (Set 3 Additions) ====================
    {
        "custom_id": "MATH-L3-003",
        "level": 3,
        "category": "Mathematics",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "What is the derivative of f(x) = x * ln(x) with respect to x evaluated at x = e?",
        "options": ["2", "1", "e", "0"],
        "correct_answer": "2",
        "explanation": "By product rule: f'(x) = 1*ln(x) + x*(1/x) = ln(x) + 1. At x = e: ln(e) + 1 = 1 + 1 = 2."
    },
    {
        "custom_id": "LOGIC-L3-003",
        "level": 3,
        "category": "Logical Reasoning",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Statements: Some servers are routers. All routers are gateways. Which conclusion definitely follows?",
        "options": [
            "Some servers are gateways",
            "All gateways are servers",
            "No gateway is a router",
            "All servers are gateways"
        ],
        "correct_answer": "Some servers are gateways",
        "explanation": "The subset of servers that are routers must belong to the gateways set since all routers are gateways."
    },
    {
        "custom_id": "APT-L3-003",
        "level": 3,
        "category": "Aptitude",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Three partners A, B, and C invest capital in the ratio 3:4:5 for durations in the ratio 2:3:1. What is their profit sharing ratio?",
        "options": ["6:12:5", "3:6:5", "1:2:1", "6:7:5"],
        "correct_answer": "6:12:5",
        "explanation": "Profit = Capital * Time => (3*2) : (4*3) : (5*1) = 6 : 12 : 5."
    },
    {
        "custom_id": "PY-L3-003",
        "level": 3,
        "category": "Python Coding",
        "difficulty": "Intermediate",
        "type": "code_output",
        "question_text": "What is the output of the following Python generator code?",
        "code_snippet": "gen = (x**2 for x in range(3))\nprint(list(gen))\nprint(list(gen))",
        "options": ["[0, 1, 4] then []", "[0, 1, 4] then [0, 1, 4]", "TypeError", "AttributeError"],
        "correct_answer": "[0, 1, 4] then []",
        "explanation": "Generators can only be iterated over once. After list(gen) consumes all items, the second call yields empty list []."
    },
    {
        "custom_id": "DBG-L3-003",
        "level": 3,
        "category": "Debugging",
        "difficulty": "Intermediate",
        "type": "debugging",
        "question_text": "What error will be triggered when calling this function on any n > 0?",
        "code_snippet": "def fib(n, memo={}):\n    if n in memo: return memo[n]\n    memo[n] = fib(n - 1) + fib(n - 2)\n    return memo[n]",
        "options": [
            "RecursionError: maximum recursion depth exceeded",
            "Returns 0 incorrectly",
            "TypeError: unhashable type",
            "MemoryError"
        ],
        "correct_answer": "RecursionError: maximum recursion depth exceeded",
        "explanation": "Without a base case (e.g. if n <= 1: return n), fib decrements indefinitely into negative values."
    },
    {
        "custom_id": "DSA-L3-003",
        "level": 3,
        "category": "DSA Concept MCQs",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "In Dijkstra's algorithm implemented with a Min-Heap, what is the time complexity for a graph with V vertices and E edges?",
        "options": ["O((V + E) log V)", "O(V^2)", "O(E + V log V)", "O(V * E)"],
        "correct_answer": "O((V + E) log V)",
        "explanation": "V extract-min operations take O(V log V) and at most E decrease-key operations take O(E log V)."
    },

    # ==================== LEVEL 4 (Set 3 Additions) ====================
    {
        "custom_id": "MATH-L4-003",
        "level": 4,
        "category": "Mathematics",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "If a 2x2 matrix has eigenvalues λ1 = 3 and λ2 = 5, what is its determinant?",
        "options": ["15", "8", "2", "25"],
        "correct_answer": "15",
        "explanation": "The determinant of a matrix equals the product of its eigenvalues: 3 * 5 = 15."
    },
    {
        "custom_id": "LOGIC-L4-003",
        "level": 4,
        "category": "Logical Reasoning",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "Six nodes P, Q, R, S, T, U form a directed acyclic pipeline where P->Q, Q->R, P->S, S->T, and both R and T lead to U. How many distinct paths exist from P to U?",
        "options": ["2", "3", "4", "1"],
        "correct_answer": "2",
        "explanation": "The paths are: P -> Q -> R -> U, and P -> S -> T -> U. Total 2 distinct paths."
    },
    {
        "custom_id": "APT-L4-003",
        "level": 4,
        "category": "Aptitude",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "25 workers complete 1/3 of a project in 24 days. How many total additional workers must be recruited to finish the remaining 2/3 work in 16 days?",
        "options": ["50", "25", "75", "30"],
        "correct_answer": "50",
        "explanation": "Total work = 25*24*3 = 1800 man-days. Remaining work = 1200 man-days. Workers needed = 1200 / 16 = 75 workers. Additional workers = 75 - 25 = 50."
    },
    {
        "custom_id": "PY-L4-003",
        "level": 4,
        "category": "Python Coding",
        "difficulty": "Intermediate",
        "type": "code_output",
        "question_text": "What does the following decorator pattern print?",
        "code_snippet": "def deco(f):\n    def wrap(*a):\n        return f(*a).upper() + '!'\n    return wrap\n\n@deco\ndef greet(name):\n    return f'hello {name}'\n\nprint(greet('loop'))",
        "options": ["HELLO LOOP!", "hello loop!", "TypeError", "None"],
        "correct_answer": "HELLO LOOP!",
        "explanation": "wrap calls greet('loop') -> 'hello loop', converts to uppercase -> 'HELLO LOOP', and appends '!' -> 'HELLO LOOP!'."
    },
    {
        "custom_id": "DBG-L4-003",
        "level": 4,
        "category": "Debugging",
        "difficulty": "Intermediate",
        "type": "debugging",
        "question_text": "Identify the concurrency flaw in this multithreaded counter without synchronization:",
        "code_snippet": "import threading\ncounter = 0\ndef inc():\n    global counter\n    for _ in range(100000):\n        counter += 1",
        "options": [
            "Race condition leads to lost updates due to non-atomic read-modify-write",
            "Deadlock occurs immediately",
            "GIL guarantees counter will always be exactly correct",
            "SyntaxError in global declaration"
        ],
        "correct_answer": "Race condition leads to lost updates due to non-atomic read-modify-write",
        "explanation": "The bytecode for counter += 1 involves load, add, and store. Thread preemption between these steps causes missed increments."
    },
    {
        "custom_id": "DSA-L4-003",
        "level": 4,
        "category": "DSA Concept MCQs",
        "difficulty": "Intermediate",
        "type": "mcq",
        "question_text": "What is the amortized cost per append operation for N insertions into a dynamically resizing array with doubling capacity?",
        "options": ["O(1)", "O(log N)", "O(N)", "O(N^2)"],
        "correct_answer": "O(1)",
        "explanation": "Sum of all reallocation copy costs across N insertions is bounded by 2N, giving an amortized constant O(1) time per append."
    }
]

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed or Verify Organizer
        org = db.query(Organizer).filter(Organizer.username == "admin").first()
        if not org:
            default_pin = os.getenv("ADMIN_PIN", "107")
            org = Organizer(
                username="admin",
                password_hash=hash_password(default_pin)
            )
            db.add(org)
            db.commit()
            print(f"[OK] Default organizer created (username: 'admin', PIN: '{default_pin}')")

        # 2. Seed or Verify EventSettings
        settings = db.query(EventSettings).first()
        if not settings:
            settings = EventSettings(
                title="LOOP",
                tagline="Every Second Counts. Every Answer Saves the Timeline.",
                status="LOBBY",
                level_names=json.dumps({"1": "Level 1", "2": "Level 2", "3": "Level 3", "4": "Level 4", "5": "The Final"}),
                questions_per_attempt=6,
                timer_duration_seconds=900,
                starting_tokens=3,
                category_distribution=json.dumps({
                    "Mathematics": 1,
                    "Logical Reasoning": 1,
                    "Aptitude": 1,
                    "Python Coding": 1,
                    "Debugging": 1,
                    "DSA Concept MCQs": 1
                }),
                score_weight_q=10.0,
                score_weight_t=5.0,
                score_weight_time=1.0,
                min_teams_to_start=1,
                registration_open=True,
                show_explanations=True,
                final_stage_open=False
            )
            db.add(settings)
            db.commit()
            print("[OK] Default EventSettings initialized in DB.")

        # 3. Seed Questions (Inserts missing questions idempotently)
        added_count = 0
        for q_data in QUESTIONS_BANK:
            exists = db.query(Question).filter(Question.custom_id == q_data["custom_id"]).first()
            if not exists:
                q = Question(
                    custom_id=q_data["custom_id"],
                    level=q_data["level"],
                    category=q_data["category"],
                    difficulty=q_data.get("difficulty", "Intermediate"),
                    type=q_data.get("type", "mcq"),
                    question_text=q_data["question_text"],
                    code_snippet=q_data.get("code_snippet"),
                    options=json.dumps(q_data["options"]),
                    correct_answer=q_data["correct_answer"],
                    explanation=q_data.get("explanation"),
                    is_active=True
                )
                db.add(q)
                added_count += 1
        db.commit()
        total_q = db.query(Question).count()
        print(f"[OK] Question Bank updated: added {added_count} new questions (Total in DB: {total_q}).")
    except Exception as e:
        print(f"[ERROR] Error during seed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
