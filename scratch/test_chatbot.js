const chatbot = require('../chatbot');
const db = require('../db');

async function runTest() {
  const userId = "test_user_999";

  console.log("--- TEST 1: Initial user message (should prompt main menu) ---");
  let response = await chatbot.handleUserMessage(userId, "Xin chào");
  console.log("Response:", response);
  if (!response.showMenu) {
    throw new Error("Test 1 failed: showMenu should be true");
  }

  console.log("\n--- TEST 2: Select 'Cư trú' menu payload (MENU_CU_TRU) ---");
  response = await chatbot.handleUserMessage(userId, null, "MENU_CU_TRU");
  console.log("Response:", response);
  let session = await db.getSession(userId);
  console.log("User session in DB:", session);
  if (session.agent_state !== 'AGENT_CU_TRU') {
    throw new Error("Test 2 failed: agent_state should be AGENT_CU_TRU");
  }

  console.log("\n--- TEST 3: Ask a question about residence rules ---");
  response = await chatbot.handleUserMessage(userId, "Đăng ký thường trú cho bé dưới 6 tuổi theo Luật mới như thế nào?");
  console.log("Response:", response);
  if (!response.text.includes("dưới 6 tuổi") && !response.text.includes("mô phỏng")) {
    throw new Error("Test 3 failed: response should mention child registration or simulation");
  }

  console.log("\n--- TEST 4: Ask an out-of-context question (should fail query or return placeholder fallback) ---");
  response = await chatbot.handleUserMessage(userId, "Thời tiết ngày mai ở Hà Nội thế nào?");
  console.log("Response:", response);

  console.log("\n--- TEST 5: Send 'menu' to reset ---");
  response = await chatbot.handleUserMessage(userId, "menu");
  console.log("Response:", response);
  session = await db.getSession(userId);
  console.log("User session in DB after reset:", session);
  if (session.agent_state !== 'MAIN_MENU') {
    throw new Error("Test 5 failed: agent_state should reset to MAIN_MENU");
  }

  console.log("\nAll Chatbot Orchestrator tests completed successfully!");
}

runTest().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
