const flow = require('../src/flow');
const { AGENT_STATES, STATIC_RESPONSE_PAYLOADS } = require('../src/flows/constants');

// Test parity sau khi module hóa flow.js (Giai đoạn 3 WS2): bảo đảm việc tách
// ngoai_kieu/khieu_nai/tthc khỏi index.js KHÔNG làm vỡ/mất payload nào.
describe('flows router parity', () => {
  test('mọi payload trong constants có phản hồi tĩnh non-null', () => {
    for (const payload of STATIC_RESPONSE_PAYLOADS) {
      expect(flow.getStaticResponse(payload)).not.toBeNull();
    }
  });

  test('mọi agentState trả về submenu không rỗng', () => {
    for (const state of AGENT_STATES) {
      const menu = flow.getSubMenu(state);
      expect(Array.isArray(menu)).toBe(true);
      expect(menu.length).toBeGreaterThan(0);
    }
  });

  test('mọi payload FLOW_* trong menu + afterReplies đều resolve (không vỡ webhook)', () => {
    const seen = new Set();
    const queue = [];
    for (const state of AGENT_STATES) {
      for (const item of flow.getSubMenu(state)) queue.push(item.payload);
    }
    while (queue.length) {
      const p = queue.shift();
      if (seen.has(p)) continue;
      seen.add(p);
      if (p === 'SHOW_MAIN_MENU') continue; // payload điều hướng, xử lý ở chatbot.js
      const r = flow.getStaticResponse(p);
      expect(r).not.toBeNull();
      if (r && r.afterReplies) {
        for (const a of r.afterReplies) {
          if (a.payload && a.payload.startsWith('FLOW_')) queue.push(a.payload);
        }
      }
    }
  });

  test('tập payload reachable khớp đúng baseline trước khi tách (53)', () => {
    const seen = new Set();
    const queue = [];
    for (const state of AGENT_STATES) {
      for (const item of flow.getSubMenu(state)) queue.push(item.payload);
    }
    while (queue.length) {
      const p = queue.shift();
      if (seen.has(p) || p === 'SHOW_MAIN_MENU') continue;
      seen.add(p);
      const r = flow.getStaticResponse(p);
      if (r && r.afterReplies) {
        for (const a of r.afterReplies) {
          if (a.payload && a.payload.startsWith('FLOW_')) queue.push(a.payload);
        }
      }
    }
    const reachable = [...seen].sort();
    expect(reachable).toEqual([...STATIC_RESPONSE_PAYLOADS].sort());
  });
});
