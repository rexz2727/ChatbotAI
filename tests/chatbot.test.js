'use strict';

// ── Module-level mocks (hoisted before any require) ──────────────────────────

// Pass the real embeddingFunction through the query mock so that
// getMockEmbedding / geminiEmbeddingFunction.generate are actually executed.
jest.mock('chromadb', () => ({
  ChromaClient: jest.fn().mockImplementation(() => ({
    getCollection: jest.fn().mockImplementation(async ({ embeddingFunction }) => ({
      query: jest.fn().mockImplementation(async ({ queryTexts }) => {
        if (embeddingFunction) {
          await embeddingFunction.generate(queryTexts);
        }
        return { documents: [['Tài liệu pháp luật mô phỏng về thủ tục cư trú.']] };
      })
    }))
  }))
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockImplementation(({ model }) => {
      if (model === 'gemini-embedding-2') {
        return {
          embedContent: jest.fn().mockResolvedValue({
            embedding: { values: new Array(3072).fill(0.1) }
          })
        };
      }
      return {
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => 'Đây là câu trả lời mô phỏng từ Gemini.' }
        })
      };
    })
  }))
}));

// flow.js provides static decision-tree responses and sub-menu quick replies
jest.mock('../src/flow', () => ({
  getSubMenu: jest.fn().mockReturnValue([
    { title: 'Đăng ký tạm trú', payload: 'FLOW_CU_TRU_TAM_TRU' }
  ]),
  getStaticResponse: jest.fn().mockReturnValue(null)
}));

// Mock the db module so chatbot tests never touch a real SQLite database
jest.mock('../src/db', () => ({
  getSession: jest.fn(),
  setSession: jest.fn().mockResolvedValue({}),
  saveMessage: jest.fn().mockResolvedValue(1),
  getConversationHistory: jest.fn().mockResolvedValue([]),
  getCachedResponse: jest.fn().mockResolvedValue(null),
  setCachedResponse: jest.fn().mockResolvedValue(undefined)
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const { handleUserMessage } = require('../src/chatbot');
const mockDb = require('../src/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Helpers ───────────────────────────────────────────────────────────────────

function resetDbMocks() {
  mockDb.setSession.mockResolvedValue({});

  mockDb.saveMessage.mockResolvedValue(1);
  mockDb.getConversationHistory.mockResolvedValue([]);
  mockDb.getSession.mockResolvedValue(null);
  mockDb.getCachedResponse.mockResolvedValue(null);
  mockDb.setCachedResponse.mockResolvedValue(undefined);
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('chatbot.js — handleUserMessage', () => {
  const userId = 'test_user_chatbot';

  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test_api_key_for_jest';
  });

  afterAll(() => {
    delete process.env.GEMINI_API_KEY;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMocks();
  });

  // ── "menu" triggers greeting/reset branch ──────────────────────────────────

  test('messageText "menu" (greeting keyword) returns showMenu: true', async () => {
    const result = await handleUserMessage(userId, 'menu', null);
    expect(result.showMenu).toBe(true);
    expect(result.text).toBeTruthy();
  });

  // ── Button payload → sub-menu quick replies ────────────────────────────────

  test('buttonPayload MENU_CU_TRU sets state AGENT_CU_TRU and returns quickReplies', async () => {
    const result = await handleUserMessage(userId, null, 'MENU_CU_TRU');

    expect(mockDb.setSession).toHaveBeenCalledWith(userId, 'AGENT_CU_TRU');
    expect(result.text).toContain('Cư trú');
    // Payload-based menu selections return quickReplies, not showMenu
    expect(result.quickReplies).toBeDefined();
  });

  // ── No session + greeting → main menu ─────────────────────────────────────

  test('greeting "Chào" with no prior session shows main menu', async () => {
    const result = await handleUserMessage(userId, 'Chào', null);
    expect(result.showMenu).toBe(true);
  });

  // ── Keyword routing with long text → answer ────────────────────────────────

  test('long text containing "cư trú" routes to AGENT_CU_TRU and answers the question', async () => {
    // Text > 15 chars → implicit-route path (continues to answer, no early return)
    const result = await handleUserMessage(userId, 'Tôi muốn hỏi về cư trú', null);

    expect(mockDb.setSession).toHaveBeenCalledWith(userId, 'AGENT_CU_TRU');
    expect(result.showMenu).toBe(false);
    expect(result.text).toContain('[Chatbot Auto]');
  });

  // ── Existing agent state → Gemini answer ──────────────────────────────────

  test('message with existing AGENT_CU_TRU state returns text answer', async () => {
    mockDb.getSession.mockResolvedValue({ agent_state: 'AGENT_CU_TRU' });

    const result = await handleUserMessage(userId, 'Thủ tục đăng ký tạm trú', null);

    expect(result.showMenu).toBe(false);
    expect(result.text).toContain('[Chatbot Auto]');
  });

  // ── MAIN_MENU state (non-greeting text) ────────────────────────────────────

  test('state MAIN_MENU with non-greeting text returns showMenu: true', async () => {
    mockDb.getSession.mockResolvedValue({ agent_state: 'MAIN_MENU' });

    // 'thông tin' is NOT in the greetings list, so it exercises the MAIN_MENU branch
    const result = await handleUserMessage(userId, 'thông tin', null);
    expect(result.showMenu).toBe(true);
  });

  // ── Unknown / invalid state → reset to MAIN_MENU ──────────────────────────

  test('unknown agent state resets to MAIN_MENU and returns showMenu: true', async () => {
    mockDb.getSession.mockResolvedValue({ agent_state: 'AGENT_INVALID_STATE' });

    const result = await handleUserMessage(userId, 'câu hỏi ngẫu nhiên', null);

    expect(result.showMenu).toBe(true);
    expect(mockDb.setSession).toHaveBeenCalledWith(userId, 'MAIN_MENU');
  });

  // ── getMockEmbedding path: empty GEMINI_API_KEY ───────────────────────────

  test('uses getMockEmbedding fallback embedding when GEMINI_API_KEY is empty', async () => {
    const saved = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';
    mockDb.getSession.mockResolvedValue({ agent_state: 'AGENT_CU_TRU' });

    const result = await handleUserMessage(userId, 'câu hỏi dùng mock embedding', null);

    process.env.GEMINI_API_KEY = saved;
    // Both embedding and Gemini use their fallback (placeholder) paths
    expect(result.text).toContain('[Chatbot Auto]');
    expect(result.showMenu).toBe(false);
  });

  // ── callGeminiWithBackoff 400-error fallback ───────────────────────────────

  test('returns placeholder when Gemini generateContent throws a 400 error', async () => {
    // First GoogleGenerativeAI instantiation: from geminiEmbeddingFunction (embedding)
    // Second: from callGeminiWithBackoff (generation) — that one throws 400
    GoogleGenerativeAI
      .mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          embedContent: jest.fn().mockResolvedValue({
            embedding: { values: new Array(3072).fill(0.1) }
          })
        })
      }))
      .mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue(
            Object.assign(new Error('Bad Request'), { status: 400 })
          )
        })
      }));

    mockDb.getSession.mockResolvedValue({ agent_state: 'AGENT_CU_TRU' });

    const result = await handleUserMessage(userId, 'câu hỏi với 400 error', null);

    expect(result.showMenu).toBe(false);
    expect(result.text).toContain('[Chatbot Auto]');
  });


  // ── F1: timing instrumentation ─────────────────────────────────────────────

  test('RAG message attaches _timing with stage durations and model metadata', async () => {
    mockDb.getSession.mockResolvedValue({ agent_state: 'AGENT_CU_TRU' });

    const result = await handleUserMessage(userId, 'Thủ tục đăng ký tạm trú cần giấy tờ gì', null);

    expect(result._timing).toBeDefined();
    expect(typeof result._timing.rag).toBe('number');
    expect(typeof result._timing.pass1).toBe('number');
    expect(typeof result._timing.pass2).toBe('number');
    expect(result._timing.cache_hit).toBe(false);
    // Pass-1 + Pass-2, mỗi pass mock thành công ngay model đầu tiên
    expect(result._timing.models_tried).toBe(2);
    expect(result._timing.model_used).toBe('gemini-2.5-flash-lite');
  });

  test('cache hit sets cache_hit=true and zero pass durations', async () => {
    mockDb.getSession.mockResolvedValue({ agent_state: 'AGENT_CU_TRU' });
    mockDb.getCachedResponse.mockResolvedValue('[Chatbot Auto] Trả lời từ cache.');

    const result = await handleUserMessage(userId, 'Thủ tục đăng ký tạm trú cần giấy tờ gì', null);

    expect(result.text).toBe('[Chatbot Auto] Trả lời từ cache.');
    expect(result._timing.cache_hit).toBe(true);
    expect(result._timing.pass1).toBe(0);
    expect(result._timing.pass2).toBe(0);
  });

  test('menu/static path returns no _timing', async () => {
    const result = await handleUserMessage(userId, null, 'MENU_CU_TRU');
    expect(result._timing).toBeUndefined();
  });
});
