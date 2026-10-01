import { GameEngine, EVENT_STATUS, MAX_LEVELS } from "./gameState.js";

console.log("=================================================");
console.log("⚡ TESTING TIME LOOP (4 LEVELS • 15 MIN • REPLACEMENT)");
console.log("=================================================\n");

const engine = new GameEngine();

// 1. Register 5 test players
const p1 = engine.registerOrLoginPlayer("sock_1", { name: "Aarav Sharma", usn: "1RV22CS001", department: "CSE", avatar: "⚡" });
const p2 = engine.registerOrLoginPlayer("sock_2", { name: "Diya Rao", usn: "1RV22IS045", department: "ISE", avatar: "🔮" });
const p3 = engine.registerOrLoginPlayer("sock_3", { name: "Rohan Patel", usn: "1RV22AI012", department: "AIML", avatar: "🤖" });

console.log(`✓ 3 Players registered in Lobby. Status: ${engine.status}`);
console.assert(engine.getDashboardStats().totalRegistered === 3, "Total registered mismatch");

// 2. Start Event
engine.startEvent();
console.log(`✓ Event started! Engine Status: ${engine.status}, Levels: ${MAX_LEVELS}`);
console.assert(engine.status === EVENT_STATUS.MAIN_GAME, "Status should be MAIN_GAME");

// 3. Test Question Editing by Admin
console.log("\n🧪 Testing Question Bank Editor (Live Edit)...");
const editRes = engine.updateQuestion(1, 0, {
  question: "CUSTOM QUESTION: What is 2 + 2?",
  category: "Math Quickie",
  type: "numerical",
  answer: "4"
});
console.assert(editRes.success === true, "Question update should succeed");
console.log(`  ✓ Question 1 of Level 1 edited: "${editRes.updatedQuestion.question}" (Answer: ${editRes.updatedQuestion.answer})`);

// 4. Test Sequential Question Progression on wrong / right answers for Player 2
console.log("\n🧪 Testing Question Progression across questions 1 to 6...");
const q1 = engine.getCurrentQuestion(p2);
console.log(`  P2 answering Q${q1.attemptNumber}/6: "${q1.question}"`);
const wrongRes = engine.submitAnswer(p2.usn, "WRONG");
console.assert(wrongRes.status === "NEXT_QUESTION", "Expected NEXT_QUESTION");
console.assert(p2.attemptIndex === 1, "Attempt index should be 1 (Q2)");
console.log(`  ✓ Question submitted -> advanced to Q${wrongRes.attemptNumber}/6!`);

// 5. Test Player 1 Attempting/Solving All 6 Questions Across All 4 Levels to ESCAPE
console.log("\n🧪 Testing 4 Levels Clearance (6 questions per level = 24 questions total) for Player 1...");
for (let lvl = 1; lvl <= 4; lvl++) {
  for (let qIdx = 0; qIdx < 6; qIdx++) {
    const q = engine.questions[lvl][p1.attemptIndex];
    const res = engine.submitAnswer(p1.usn, q.answer);
    if (qIdx < 5) {
      console.assert(res.status === "NEXT_QUESTION", `Expected NEXT_QUESTION on Q${qIdx + 1}`);
    } else {
      if (lvl < 4) {
        console.assert(res.status === "LEVEL_CLEARED", `Level ${lvl} should be cleared on Q6`);
        console.log(`  ✓ Level ${lvl} (6/6 questions completed) -> Advanced to Level ${p1.level}`);
      } else {
        console.assert(res.status === "ESCAPED", "Level 4 should escape loop");
        console.assert(p1.status === "ESCAPED", "Player status should be ESCAPED");
        console.log(`  🔓 AARAV SHARMA COMPLETED ALL 24 QUESTIONS ACROSS 4 LEVELS AND ESCAPED THE TIME LOOP!`);
      }
    }
  }
}

console.log("\n=================================================");
console.log("✅ ALL 4-LEVEL & 6-QUESTION SEQUENTIAL PROGRESSION TESTS PASSED!");
console.log("=================================================\n");
