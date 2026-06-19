const { getSession, setSession, db } = require('../db');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
};

const runTests = async () => {
  console.log('Starting SQLite Session DB tests...');
  const testUserId = `test_user_${Date.now()}`;

  try {
    // 1. Test getSession for non-existent user
    console.log('\n--- Test 1: Get non-existent session ---');
    const initialSession = await getSession(testUserId);
    assert(initialSession === null, 'Non-existent session should return null');

    // 2. Test setSession (insert)
    console.log('\n--- Test 2: Set session (Insert) ---');
    const state1 = 'AGENT_CU_TRU';
    const insertResult = await setSession(testUserId, state1);
    assert(insertResult !== null, 'Insert result should not be null');
    assert(insertResult.user_id === testUserId, 'Inserted user_id matches');
    assert(insertResult.agent_state === state1, 'Inserted agent_state matches');
    assert(typeof insertResult.updated_at === 'number', 'updated_at is an integer timestamp');

    // 3. Test getSession (retrieve inserted)
    console.log('\n--- Test 3: Get session (Retrieve) ---');
    const retrievedSession1 = await getSession(testUserId);
    assert(retrievedSession1 !== null, 'Retrieved session should not be null');
    assert(retrievedSession1.user_id === testUserId, 'Retrieved user_id matches');
    assert(retrievedSession1.agent_state === state1, 'Retrieved agent_state matches');
    assert(typeof retrievedSession1.updated_at === 'number', 'Retrieved updated_at is an integer timestamp');

    // 4. Test setSession (update / upsert)
    console.log('\n--- Test 4: Set session (Update/Upsert) ---');
    const state2 = 'AGENT_CAN_CUOC';
    const updateResult = await setSession(testUserId, state2);
    assert(updateResult !== null, 'Update result should not be null');
    assert(updateResult.user_id === testUserId, 'Updated user_id matches');
    assert(updateResult.agent_state === state2, 'Updated agent_state matches');
    assert(updateResult.updated_at >= insertResult.updated_at, 'updated_at is updated');

    // 5. Test getSession (retrieve updated)
    console.log('\n--- Test 5: Get session after update ---');
    const retrievedSession2 = await getSession(testUserId);
    assert(retrievedSession2 !== null, 'Retrieved session after update should not be null');
    assert(retrievedSession2.agent_state === state2, 'Retrieved agent_state is updated to AGENT_CAN_CUOC');

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('\nTests failed with error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
};

runTests();
