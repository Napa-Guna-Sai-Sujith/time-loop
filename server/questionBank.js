// Question bank for TIME LOOP platform
// 4 Levels with 6 Questions each (total 24 editable questions) + Final Round 5-Stage Mystery ARG

export const DEFAULT_QUESTIONS = {
  1: [
    {
      id: "L1_Q1",
      level: 1,
      category: "Aptitude",
      type: "mcq",
      question: "A train running at a speed of 72 km/hr crosses a 200m long platform in 22 seconds. What is the length of the train?",
      options: ["220 m", "240 m", "260 m", "200 m"],
      answer: "240 m",
      explanation: "Speed = 72 * (5/18) = 20 m/s. Distance = Speed * Time = 20 * 22 = 440m. Train length = 440 - 200 = 240m."
    },
    {
      id: "L1_Q2",
      level: 1,
      category: "Logical Series",
      type: "numerical",
      question: "Find the missing number in the temporal series: 3, 7, 15, 31, 63, ?",
      options: [],
      answer: "127",
      explanation: "Pattern is (x * 2) + 1. 63 * 2 + 1 = 127."
    },
    {
      id: "L1_Q3",
      level: 1,
      category: "Aptitude",
      type: "mcq",
      question: "If 12 machines can produce 1200 items in 6 hours, how many items can 8 machines produce in 9 hours?",
      options: ["1000", "1200", "1400", "800"],
      answer: "1200",
      explanation: "1 machine per hour = 1200 / (12 * 6) = 16.666 items. 8 * 9 * 16.666 = 1200 items."
    },
    {
      id: "L1_Q4",
      level: 1,
      category: "Math & Logic",
      type: "numerical",
      question: "In a race of 100 meters, A beats B by 10 meters and beats C by 19 meters. In a 90m race between B and C, by how many meters will B beat C?",
      options: [],
      answer: "9",
      explanation: "When A=100, B=90, C=81. When B runs 90m, C runs 81m, so B beats C by 9m."
    },
    {
      id: "L1_Q5",
      level: 1,
      category: "Aptitude",
      type: "mcq",
      question: "A trader marks his goods at 25% above the cost price and allows a discount of 10% on the marked price. What is his net profit percentage?",
      options: ["12.5%", "15%", "17.5%", "10%"],
      answer: "12.5%",
      explanation: "CP = 100 -> MP = 125. SP = 125 * 0.9 = 112.5. Profit = 12.5%."
    },
    {
      id: "L1_Q6",
      level: 1,
      category: "Logical Deduction",
      type: "mcq",
      question: "Pointing to a photograph, Rohit said, 'She is the daughter of my grandfather's only son.' How is the girl in the photo related to Rohit?",
      options: ["Sister", "Mother", "Cousin", "Aunt"],
      answer: "Sister",
      explanation: "Grandfather's only son is Rohit's father. Father's daughter is Rohit's sister."
    }
  ],
  2: [
    {
      id: "L2_Q1",
      level: 2,
      category: "Logical Coding",
      type: "mcq",
      question: "In a certain code, 'TEMPORAL' is written as 'UGNQPSBM'. How is 'QUANTUM' written in that same cipher?",
      options: ["RVBOUVN", "RVBOVVN", "RWBOVVN", "RVCPVVN"],
      answer: "RVBOVVN",
      explanation: "Each letter is shifted by +1 in the alphabet: Q->R, U->V, A->B, N->O, T->U, U->V, M->N."
    },
    {
      id: "L2_Q2",
      level: 2,
      category: "Math Reasoning",
      type: "numerical",
      question: "A clock shows 3:15. What is the angle (in degrees) between the hour hand and the minute hand?",
      options: [],
      answer: "7.5",
      explanation: "Angle = |(30*H) - (5.5*M)| = |(30*3) - (5.5*15)| = |90 - 82.5| = 7.5 degrees."
    },
    {
      id: "L2_Q3",
      level: 2,
      category: "Pattern Logic",
      type: "mcq",
      question: "Which term replaces the question mark?\n2B, 4C, 8E, 16H, ?",
      options: ["32L", "32K", "32M", "64L"],
      answer: "32L",
      explanation: "Numbers double: 2, 4, 8, 16, 32. Letters increment by +1, +2, +3, +4: B(+1)->C(+2)->E(+3)->H(+4)->L."
    },
    {
      id: "L2_Q4",
      level: 2,
      category: "Puzzles",
      type: "numerical",
      question: "You have 9 identical-looking gold coins, but 1 is a lighter counterfeit. What is the minimum number of balance scale weighings needed to guarantee finding the fake coin?",
      options: [],
      answer: "2",
      explanation: "Divide into 3 groups of 3 (weigh 3 vs 3). Take the lighter group of 3 and weigh 1 vs 1. Exactly 2 weighings."
    },
    {
      id: "L2_Q5",
      level: 2,
      category: "Logical Reasoning",
      type: "mcq",
      question: "Statements: All loops are cycles. Some cycles are quantum.\nConclusions:\nI. Some loops are quantum.\nII. Some cycles are loops.",
      options: ["Only II follows", "Only I follows", "Both follow", "Neither follows"],
      answer: "Only II follows",
      explanation: "Since All loops are cycles, conversion yields Some cycles are loops (II follows). I does not necessarily follow."
    },
    {
      id: "L2_Q6",
      level: 2,
      category: "Binary & Sets",
      type: "numerical",
      question: "In a class of 60 students, 35 code in Python, 28 code in C++, and 12 code in both. How many students do not code in either language?",
      options: [],
      answer: "9",
      explanation: "Total coders = 35 + 28 - 12 = 51. Non-coders = 60 - 51 = 9."
    }
  ],
  3: [
    {
      id: "L3_Q1",
      level: 3,
      category: "C/C++ Output",
      type: "numerical",
      question: "What is the exact output of this C code snippet?\n```c\n#include <stdio.h>\nint main() {\n    int a = 5;\n    printf(\"%d\", a++ + ++a);\n    return 0;\n}\n```",
      options: [],
      answer: "12",
      explanation: "Under standard C sequence evaluation, a starts as 5 (evaluates to 5, then a becomes 6), ++a makes it 7. 5 + 7 = 12."
    },
    {
      id: "L3_Q2",
      level: 3,
      category: "Python Output",
      type: "mcq",
      question: "What is the output of the following Python expression?\n```python\nprint([i for i in range(5) if i % 2 == 0][::-1])\n```",
      options: ["[4, 2, 0]", "[0, 2, 4]", "[4, 2]", "[2, 0]"],
      answer: "[4, 2, 0]",
      explanation: "List comprehension generates [0, 2, 4], and [::-1] reverses it to [4, 2, 0]."
    },
    {
      id: "L3_Q3",
      level: 3,
      category: "JavaScript Quirks",
      type: "mcq",
      question: "What is the output of `console.log([] + [] + 1 + false)` in JavaScript?",
      options: ["'1false'", "NaN", "'[object Object]'", "1"],
      answer: "'1false'",
      explanation: "[] + [] evaluates to '', '' + 1 = '1', '1' + false = '1false'."
    },
    {
      id: "L3_Q4",
      level: 3,
      category: "Recursion",
      type: "numerical",
      question: "What value does `f(4)` return for:\n```python\ndef f(n):\n    if n <= 1: return 1\n    return f(n-1) + 2 * f(n-2)\n```",
      options: [],
      answer: "11",
      explanation: "f(0)=1, f(1)=1, f(2)=1+2(1)=3, f(3)=3+2(1)=5, f(4)=5+2(3)=11."
    },
    {
      id: "L3_Q5",
      level: 3,
      category: "Pointers & Memory",
      type: "numerical",
      question: "What value is printed?\n```c\nint arr[] = {10, 20, 30, 40, 50};\nint *ptr = arr + 1;\nprintf(\"%d\", *(ptr + 2));\n```",
      options: [],
      answer: "40",
      explanation: "arr + 1 points to arr[1] (20). ptr + 2 points to arr[1+2] = arr[3] (40)."
    },
    {
      id: "L3_Q6",
      level: 3,
      category: "DBMS & SQL",
      type: "mcq",
      question: "Which normal form removes partial dependencies where non-prime attributes depend on a proper subset of a composite candidate key?",
      options: ["2NF", "1NF", "3NF", "BCNF"],
      answer: "2NF",
      explanation: "Second Normal Form (2NF) enforces that non-key attributes depend on the entire candidate key."
    }
  ],
  4: [
    {
      id: "L4_Q1",
      level: 4,
      category: "Data Structures & Trees",
      type: "numerical",
      question: "A strictly binary tree has 31 leaf nodes. How many total nodes does the tree contain?",
      options: [],
      answer: "61",
      explanation: "For any full/strict binary tree: Total Nodes = 2 * Leaves - 1 = 2 * 31 - 1 = 61."
    },
    {
      id: "L4_Q2",
      level: 4,
      category: "Algorithm Complexity",
      type: "mcq",
      question: "What is the tightest worst-case time complexity of finding the median in an unsorted array of N elements using standard QuickSelect?",
      options: ["O(N^2)", "O(N)", "O(N log N)", "O(log N)"],
      answer: "O(N^2)",
      explanation: "Standard QuickSelect has an expected O(N) time, but worst-case with poor pivots is O(N^2)."
    },
    {
      id: "L4_Q3",
      level: 4,
      category: "Combinatorics",
      type: "numerical",
      question: "How many distinct Binary Search Trees (BSTs) can be constructed using 4 distinct keys (Catalan number C_4)?",
      options: [],
      answer: "14",
      explanation: "C_4 = (1 / 5) * (8 choose 4) = 14."
    },
    {
      id: "L4_Q4",
      level: 4,
      category: "Quantum Cryptarithm",
      type: "numerical",
      question: "Solve the cryptarithm where each distinct letter represents a distinct digit (0-9):\n`TIME + LOOP = PULSE`\nIf T=9, I=2, M=4, E=5, L=1, O=0, what is the value of S?",
      options: [],
      answer: "3",
      explanation: "TIME = 9245, LOOP = 1008. 9245 + 1008 = 10253. S=3."
    },
    {
      id: "L4_Q5",
      level: 4,
      category: "Advanced Bit Logic",
      type: "numerical",
      question: "What is the value of `f(1024)` where `f(n) = n ^ (n >> 1) ^ (n >> 2)`?",
      options: [],
      answer: "1792",
      explanation: "1024 = 10000000000(bin). 1024 ^ 512 ^ 256 = 1792."
    },
    {
      id: "L4_Q6",
      level: 4,
      category: "Master Modular Arithmetic",
      type: "numerical",
      question: "Find the last 2 digits (remainder when divided by 100) of 3^2026:",
      options: [],
      answer: "29",
      explanation: "3^20 = 1 (mod 100). 3^2026 = 3^(20*101 + 6) = 3^6 = 729 = 29 (mod 100)."
    }
  ]
};

// 5-Stage Mystery ARG Puzzle for Finalists: "BREAK THE LOOP"
export const FINAL_ROUND_PUZZLE = {
  totalTimeMinutes: 10,
  stages: [
    {
      stage: 1,
      title: "STAGE 1: QUANTUM SEQUENCE (Pattern)",
      prompt: "Find the missing sequence key that stabilizes the loop anomaly:",
      puzzleText: "16, 22, 34, 58, 106, [ ? ]",
      hint: "Look at the differences between consecutive temporal states (+6, +12, +24, +48...).",
      expectedAnswer: "202",
      explanation: "Differences: +6, +12, +24, +48, next is +96. 106 + 96 = 202."
    },
    {
      stage: 2,
      title: "STAGE 2: LOGIC MATRIX (Deduction)",
      prompt: "Decode the sector index from the logic matrix:",
      puzzleText: "If ALPHA = 14, BETA = 8, GAMMA = 12, what is the value of OMEGA?",
      hint: "Evaluate word length multiplied by 2",
      expectedAnswer: "10",
      explanation: "Length of OMEGA is 5. 5 * 2 = 10."
    },
    {
      stage: 3,
      title: "STAGE 3: ALGORITHMIC CLUE (Math)",
      prompt: "Calculate the checksum of the recursive core:",
      puzzleText: "A server has 256 GB of memory. Every cycle it splits into half. What is the sum of memory sizes at depth 1, 2, and 3? (128 + 64 + 32)",
      hint: "Sum the three powers of 2 directly",
      expectedAnswer: "224",
      explanation: "128 + 64 + 32 = 224."
    },
    {
      stage: 4,
      title: "STAGE 4: CIPHER OVERRIDE (Hidden Message)",
      prompt: "Shift the cryptic intercept backwards by 3 positions (Caesar -3):",
      puzzleText: "Intercepted Key: 'WLPH'",
      hint: "Shift each letter back: W-3, L-3, P-3, H-3",
      expectedAnswer: "TIME",
      explanation: "W-3=T, L-3=I, P-3=M, H-3=E -> 'TIME'."
    },
    {
      stage: 5,
      title: "STAGE 5: MASTER TEMPORAL OVERRIDE (Final Code)",
      prompt: "Combine the Stage 1 last digit (2), Stage 2 last digit (0), Stage 3 last digit (4), and the letter count of Stage 4 (4) to form the Master 4-digit Temporal Passcode:",
      puzzleText: "ENTER THE 4-DIGIT TIMELOOP ESCAPE KEY:",
      hint: "Stage 1 (202 -> '2'), Stage 2 (10 -> '0'), Stage 3 (224 -> '4'), Stage 4 (TIME len -> '4')",
      expectedAnswer: "2044",
      explanation: "The escape code that shatters the quantum continuum is 2044."
    }
  ]
};
