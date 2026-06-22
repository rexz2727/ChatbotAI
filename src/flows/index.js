const cuTru = require('./cu_tru');
const canCuoc = require('./can_cuoc');
const giaoThong = require('./giao_thong');
const anNinh = require('./an_ninh');
const ngoaiKieu = require('./ngoai_kieu');
const khieuNai = require('./khieu_nai');
const tthc = require('./tthc');
const donvi = require('../../config/donvi');

// Menu Liên hệ chỉ trỏ tới node tĩnh từ config/donvi.js (lienHeNodes) — giữ ở đây vì 1 dòng.
const lienHeMenus = {
  'AGENT_LIEN_HE': [
    { title: "Thông tin Liên hệ", payload: "FLOW_LIEN_HE" }
  ]
};

const allMenus = {
  ...cuTru.menus,
  ...canCuoc.menus,
  ...giaoThong.menus,
  ...anNinh.menus,
  ...ngoaiKieu.menus,
  ...khieuNai.menus,
  ...tthc.menus,
  ...lienHeMenus
};

const allResponses = {
  ...cuTru.responses,
  ...canCuoc.responses,
  ...giaoThong.responses,
  ...anNinh.responses,
  ...ngoaiKieu.responses,
  ...khieuNai.responses,
  ...tthc.responses,
  ...donvi.danhBaNodes,
  ...donvi.lienHeNodes
};

module.exports = {
  getStaticResponse: (payload) => {
    return allResponses[payload] || null;
  },
  getSubMenu: (agentState) => {
    return allMenus[agentState] || [];
  }
};
