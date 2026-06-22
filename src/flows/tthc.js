const menus = {
  'AGENT_TTHC': [
    { title: "Hỏi đáp TTHC chung", payload: "FLOW_TTHC_AI" },
    { title: "Danh bạ cán bộ TTHC", payload: "FLOW_TTHC_DANH_BA" }
  ]
};

const responses = {
  'FLOW_TTHC_AI': { agentState: 'AGENT_TTHC', text: `Xin mời đặt câu hỏi về TTHC khác.`, openChat: true }
};

module.exports = { menus, responses };
