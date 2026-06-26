const menus = {
  'AGENT_TTHC': [
    { title: "Hỏi đáp TTHC chung", payload: "FLOW_TTHC_AI" },
    { title: "Danh bạ cán bộ TTHC", payload: "FLOW_TTHC_DANH_BA" }
  ]
};

const responses = {
  'FLOW_TTHC_AI': { agentState: 'AGENT_TTHC', text: `Dạ, anh/chị cứ đặt câu hỏi về các thủ tục hành chính khác, bot giải đáp ngay ạ.`, openChat: true }
};

module.exports = { menus, responses };
