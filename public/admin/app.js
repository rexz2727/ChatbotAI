// =============================================================================
// Admin Dashboard – app.js (phiên bản nâng cấp)
// Giữ nguyên toàn bộ chức năng cũ, bổ sung hiệu ứng & tiện ích mới.
// =============================================================================

// ─── Global 401 handling: chuyển hướng về trang login khi bị 401 ─────────────
const _originalFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  const res = await _originalFetch(...args);
  if (res.status === 401) {
    window.location = '/login.html';
  }
  return res;
};

// ─── XSS helper — escape dữ liệu không tin cậy trước khi render HTML ────────
const esc = (s) =>
  String(s ?? '-').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

// ─── Count-up animation (ease-out-cubic) ─────────────────────────────────────
// Hiệu ứng đếm số từ giá trị hiện tại lên giá trị mới.
function animateCountUp(element, targetValue, duration = 1000) {
  if (!element) return;
  const startValue = parseInt(element.innerText, 10) || 0;
  const diff = targetValue - startValue;
  if (diff === 0) { element.innerText = targetValue; return; }

  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out-cubic: 1 - (1 - t)^3
    const eased = 1 - Math.pow(1 - progress, 3);
    element.innerText = Math.round(startValue + diff * eased);
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

// ─── Sparkline drawing ───────────────────────────────────────────────────────
// Vẽ biểu đồ mini trên canvas với gradient fill.
function drawSparkline(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data || data.length === 0) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
  const h = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

  const drawW = canvas.offsetWidth;
  const drawH = canvas.offsetHeight;
  const padding = 4;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const stepX = (drawW - padding * 2) / (data.length - 1 || 1);

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, padding, 0, drawH);
  gradient.addColorStop(0, color + '44'); // ~27% opacity
  gradient.addColorStop(1, color + '00'); // transparent

  // Vẽ đường line
  ctx.clearRect(0, 0, drawW, drawH);
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = padding + i * stepX;
    const y = drawH - padding - ((val - min) / range) * (drawH - padding * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Fill area
  const lastX = padding + (data.length - 1) * stepX;
  ctx.lineTo(lastX, drawH);
  ctx.lineTo(padding, drawH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
}

// =============================================================================
// DOMContentLoaded – Khởi tạo toàn bộ ứng dụng
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {

  // ─── Biến theo dõi thời gian đồng bộ cuối cùng ──────────────────────────
  let lastSyncedTime = Date.now();

  // ─── Đồng hồ realtime (#realtime-clock) ─────────────────────────────────
  function updateRealtimeClock() {
    const el = document.getElementById('realtime-clock');
    if (el) {
      el.textContent = new Date().toLocaleTimeString('vi-VN');
    }
  }
  setInterval(updateRealtimeClock, 1000);
  updateRealtimeClock();

  // ─── Last synced timer (#last-synced) ────────────────────────────────────
  function updateLastSynced() {
    const el = document.getElementById('last-synced');
    if (!el) return;
    const diff = Math.floor((Date.now() - lastSyncedTime) / 1000);
    if (diff < 5) {
      el.textContent = 'vừa xong';
    } else if (diff < 60) {
      el.textContent = `${diff}s trước`;
    } else {
      const m = Math.floor(diff / 60);
      el.textContent = `${m}m trước`;
    }
  }
  setInterval(updateLastSynced, 1000);

  // Helper — đánh dấu đã đồng bộ thành công
  function markSynced() {
    lastSyncedTime = Date.now();
  }

  // ─── Logout ──────────────────────────────────────────────────────────────
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await fetch('/api/logout', { method: 'POST' }); } catch (e) {}
      window.location = '/login.html';
    });
  }

  // ─── Navigation (sidebar) ───────────────────────────────────────────────
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view');

  // Map tên view → breadcrumb text
  const breadcrumbMap = {
    'dashboard-view': 'Tổng quan',
    'feedback-view': 'Góp ý',
    'forms-view': 'Biểu mẫu',
    'system-view': 'Hệ thống',
  };

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.dataset.target;
      document.getElementById(targetId).classList.add('active');

      // ── Cập nhật breadcrumb ──
      const breadcrumb = document.querySelector('.header-breadcrumb');
      if (breadcrumb && breadcrumbMap[targetId]) {
        breadcrumb.textContent = breadcrumbMap[targetId];
      }

      // Refresh data dựa trên view đang hiển thị
      if (targetId === 'dashboard-view') {
        loadStats();
        loadAnalytics();
        loadHealth();
        loadFeedback();
        loadForms();
      }
      if (targetId === 'system-view') {
        loadHealth();
        loadMetrics();
        loadLogs();
        loadSecurity();
        loadContainers();
        loadSecurityMonitoring();
      }
    });
  });

  // ─── Sidebar Toggle ──────────────────────────────────────────────────────
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // ─── Time filter buttons ─────────────────────────────────────────────────
  // Các nút lọc theo khoảng thời gian (data-days attribute)
  document.querySelectorAll('.time-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle active class giữa các nút cùng nhóm
      btn.parentElement.querySelectorAll('.time-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // =========================================================================
  //  API Data Loaders
  // =========================================================================

  // ─── Load Stats (có count-up animation) ──────────────────────────────────
  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();

      // Sử dụng animateCountUp thay vì gán trực tiếp
      const elUsers = document.getElementById('stat-users');
      const elMessages = document.getElementById('stat-messages');
      animateCountUp(elUsers, data.totalUsers, 1000);
      animateCountUp(elMessages, data.totalMessages, 1000);

      // Trend placeholders (nếu phần tử tồn tại)
      const trendUsers = document.getElementById('trend-users');
      const trendMessages = document.getElementById('trend-messages');
      if (trendUsers) trendUsers.textContent = '+12%';
      if (trendMessages) trendMessages.textContent = '+8%';

      markSynced();
    } catch (e) { console.error('Failed to load stats'); }
  }

  // ─── Load Feedback ───────────────────────────────────────────────────────
  async function loadFeedback() {
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      const tbody = document.getElementById('feedback-table-body');
      const dashBody = document.getElementById('dash-feedback-table');
      const rows = data.map(item => `
        <tr>
          <td>${new Date(item.timestamp).toLocaleString('vi-VN')}</td>
          <td><code>${item.senderId}</code></td>
          <td>${item.content}</td>
        </tr>
      `).join('');

      if (tbody) {
        if (data.length === 0) {
          tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 15px;"><div style="font-size: 36px; margin-bottom: 16px; opacity: 0.5;">📭</div>Chưa có góp ý nào từ người dùng</td></tr>`;
        } else {
          tbody.innerHTML = rows;
        }
      }

      if (dashBody) {
        if (data.length === 0) {
          dashBody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 15px; border-bottom: none;"><div style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;">💬</div>Chưa có góp ý mới</td></tr>`;
        } else {
          dashBody.innerHTML = data.slice(0, 5).map(item => `
            <tr>
              <td>${item.content.substring(0, 50)}${item.content.length > 50 ? '...' : ''}</td>
              <td><code>${item.senderId}</code></td>
            </tr>
          `).join('');
        }
      }

      markSynced();
    } catch (e) { console.error('Failed to load feedback'); }
  }

  // ─── Load Forms ──────────────────────────────────────────────────────────
  async function loadForms() {
    try {
      const res = await fetch('/api/forms');
      const data = await res.json();
      const tbody = document.getElementById('forms-table-body');
      tbody.innerHTML = data.map(item => `
        <tr>
          <td><a href="/forms/${item.name}" target="_blank">${item.name}</a></td>
          <td>${Math.round(item.size / 1024)} KB</td>
          <td>
            <button class="btn danger" onclick="deleteForm('${item.name}')">Xóa</button>
          </td>
        </tr>
      `).join('');
      markSynced();
    } catch (e) { console.error('Failed to load forms'); }
  }

  // ─── Chart instances ────────────────────────────────────────────────────
  let messagesChartInstance = null;
  let topicsChartInstance = null;

  // ─── Load Analytics (enhanced Chart.js configs) ──────────────────────────
  async function loadAnalytics() {
    try {
      const msgRes = await fetch('/api/analytics/messages-by-day');
      const msgData = await msgRes.json();
      const topicRes = await fetch('/api/analytics/topics');
      const topicData = await topicRes.json();

      // ── Messages Chart — gradient fill + glassmorphism tooltip ──
      const msgCanvas = document.getElementById('messagesChart');
      const msgCtx = msgCanvas.getContext('2d');

      // Tạo gradient cho area fill
      const msgGradient = msgCtx.createLinearGradient(0, 0, 0, msgCanvas.height || 300);
      msgGradient.addColorStop(0, 'rgba(0, 242, 254, 0.35)');
      msgGradient.addColorStop(0.7, 'rgba(0, 242, 254, 0.05)');
      msgGradient.addColorStop(1, 'rgba(0, 242, 254, 0)');

      if (messagesChartInstance) messagesChartInstance.destroy();
      messagesChartInstance = new Chart(msgCtx, {
        type: 'line',
        data: {
          labels: msgData.map(d => d.day),
          datasets: [{
            label: 'Số tin nhắn',
            data: msgData.map(d => d.count),
            borderColor: '#00f2fe',
            backgroundColor: msgGradient,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#090e17',
            pointBorderColor: '#00f2fe',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: '#00f2fe',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 800,
            easing: 'easeOutQuart',
          },
          interaction: {
            intersect: false,
            mode: 'index',
          },
          plugins: {
            legend: { labels: { color: '#e2e8f0', font: { family: "'Inter', sans-serif" } } },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              titleColor: '#f1f5f9',
              bodyColor: '#cbd5e1',
              titleFont: { weight: '600', family: "'Inter', sans-serif" },
              bodyFont: { family: "'Inter', sans-serif" },
              cornerRadius: 10,
              padding: 12,
              displayColors: false,
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#94a3b8', font: { family: "'Inter', sans-serif" } },
            },
            y: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#94a3b8', font: { family: "'Inter', sans-serif" } },
            },
          },
        },
      });

      // ── Topics Chart — enhanced doughnut ──
      const topicCtx = document.getElementById('topicsChart').getContext('2d');
      if (topicsChartInstance) topicsChartInstance.destroy();
      topicsChartInstance = new Chart(topicCtx, {
        type: 'doughnut',
        data: {
          labels: topicData.map(d => d.topic),
          datasets: [{
            data: topicData.map(d => d.count),
            backgroundColor: ['#00f2fe', '#4facfe', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'],
            borderColor: '#090e17',
            borderWidth: 2,
            hoverBorderColor: '#1e293b',
            hoverOffset: 8,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            animateRotate: true,
            duration: 1000,
            easing: 'easeOutQuart',
          },
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#e2e8f0', padding: 20, font: { family: "'Inter', sans-serif" } },
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              titleColor: '#f1f5f9',
              bodyColor: '#cbd5e1',
              cornerRadius: 10,
              padding: 12,
            },
          },
          cutout: '70%',
        },
      });

      // ── Sparklines – vẽ sau khi có dữ liệu analytics ──
      const msgCounts = msgData.map(d => d.count);
      drawSparkline('spark-messages', msgCounts, '#00f2fe');

      // Dữ liệu mock cho spark-users (tích lũy dần)
      const mockUserData = msgCounts.map((_, i) =>
        Math.max(10, Math.round(50 + i * 3 + Math.random() * 10))
      );
      drawSparkline('spark-users', mockUserData, '#10b981');

      markSynced();
    } catch (e) { console.error('Failed to load analytics', e); }
  }

  // ─── Load Health ─────────────────────────────────────────────────────────
  async function loadHealth() {
    try {
      const res = await fetch('/api/health-details');
      const data = await res.json();

      const formatUptime = (seconds) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        return `${d}d ${h}h ${m}m`;
      };

      const formatBytes = (bytes) => {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
      };

      if (document.getElementById('health-uptime')) {
        document.getElementById('health-uptime').innerText = formatUptime(data.uptime);
        document.getElementById('health-memory').innerText = formatBytes(data.memory);
        document.getElementById('health-db').innerText = data.dbStatus;
        document.getElementById('health-chroma').innerText = data.chromaStatus;
        document.getElementById('health-db').style.color = data.dbStatus === 'OK' ? '#10b981' : '#ef4444';
        document.getElementById('health-chroma').style.color = data.chromaStatus === 'OK' ? '#10b981' : '#ef4444';
      }

      if (document.getElementById('health-uptime-dash')) {
        document.getElementById('health-uptime-dash').innerText = formatUptime(data.uptime);
        document.getElementById('health-db-dash').innerText = data.dbStatus;
        document.getElementById('health-db-dash').style.color = data.dbStatus === 'OK' ? '#10b981' : '#ef4444';
      }

      markSynced();
    } catch (e) { console.error('Failed to load health'); }
  }

  // ─── Poll health every 10 seconds ───────────────────────────────────────
  setInterval(() => {
    if (document.getElementById('system-view')?.classList.contains('active') ||
        document.getElementById('dashboard-view')?.classList.contains('active')) {
      loadHealth();
    }
  }, 10000);

  // ─── Poll APM / System every 3 seconds ─────────────────────────────────
  setInterval(() => {
    if (document.getElementById('system-view')?.classList.contains('active')) {
      loadLogs();
      loadSecurity();
      loadMetrics();
      loadContainers();
      loadSecurityMonitoring();
    }
  }, 3000);

  // ─── Load Containers ────────────────────────────────────────────────────
  async function loadContainers() {
    try {
      const res = await fetch('/api/system/containers');
      const data = await res.json();

      const hostRes = await fetch('/api/system/host-services');
      const hostData = await hostRes.json();

      const tbody = document.getElementById('containers-table-body');
      if (tbody) {
        let rows = '';
        if (data.containers) {
          rows += data.containers.map(c => `
            <tr>
              <td style="font-weight:bold; color:var(--primary)">${c.name}</td>
              <td style="color:${c.state === 'running' ? 'var(--success)' : 'var(--danger)'}">
                ${c.state === 'running' ? '🟢 Đang chạy' : '🔴 Dừng'}
              </td>
              <td>${c.status}</td>
            </tr>
          `).join('');
        }
        if (hostData.services) {
          rows += hostData.services.map(c => `
            <tr>
              <td style="font-weight:bold; color:#10b981">${c.name} (Host Service)</td>
              <td style="color:${c.state === 'running' ? 'var(--success)' : 'var(--danger)'}">
                ${c.state === 'running' ? '🟢 Đang chạy' : '🔴 Dừng'}
              </td>
              <td>${c.status}</td>
            </tr>
          `).join('');
        }
        tbody.innerHTML = rows;
      }

      markSynced();
    } catch (e) { console.error('Failed to load containers/services', e); }
  }

  // ─── Log — phân loại & highlight ─────────────────────────────────────────
  let allLogs = [];         // Lưu toàn bộ log để lọc
  let currentLogFilter = 'all';

  // Phân loại log line dựa trên nội dung
  function classifyLog(line) {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('fail') || lower.includes('exception'))
      return 'log-error';
    if (lower.includes('warn'))
      return 'log-warn';
    if (lower.includes('honeypot') || lower.includes('trap') || lower.includes('decoy'))
      return 'log-honeypot';
    if (lower.includes('debug') || lower.includes('trace'))
      return 'log-debug';
    return 'log-info';
  }

  // Highlight timestamp trong log line (dạng YYYY-MM-DD HH:MM:SS hoặc ISO)
  function highlightTimestamp(line) {
    return line.replace(
      /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/g,
      '<span class="log-timestamp">$1</span>'
    );
  }

  // Render log đã lọc ra terminal
  function renderLogs(logs) {
    const terminal = document.getElementById('log-terminal');
    if (!terminal) return;

    const filtered = currentLogFilter === 'all'
      ? logs
      : logs.filter(l => classifyLog(l) === `log-${currentLogFilter}`);

    terminal.innerHTML = filtered.map(l => {
      const cls = classifyLog(l);
      const highlighted = highlightTimestamp(esc(l));
      return `<div class="${cls}">${highlighted}</div>`;
    }).join('');

    terminal.scrollTop = terminal.scrollHeight;
  }

  // ─── Log filter buttons ─────────────────────────────────────────────────
  document.querySelectorAll('.log-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLogFilter = btn.dataset.level || 'all';
      renderLogs(allLogs);
    });
  });

  // ─── Load Logs (với syntax highlighting) ─────────────────────────────────
  async function loadLogs() {
    try {
      const res = await fetch('/api/system/logs');
      const data = await res.json();
      if (data.logs) {
        allLogs = data.logs;
        renderLogs(allLogs);
      }
      markSynced();
    } catch (e) { console.error('Failed to load logs', e); }
  }

  // ─── Load Security ──────────────────────────────────────────────────────
  async function loadSecurity() {
    try {
      const res = await fetch('/api/system/security');
      const data = await res.json();
      const tbody = document.getElementById('security-table-body');
      if (tbody && data.incidents) {
        tbody.innerHTML = data.incidents.map(inc =>
          `<tr><td style="color: var(--danger)">${inc}</td></tr>`
        ).join('');
      }
      markSynced();
    } catch (e) { console.error('Failed to load security incidents', e); }
  }

  // ─── Load Security Monitoring ───────────────────────────────────────────
  async function loadSecurityMonitoring() {
    try {
      const sumRes = await fetch('/api/security/summary');
      const summary = await sumRes.json();
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val ?? 0;
      };
      setVal('sec-scanned', summary.scanned);
      setVal('sec-malicious', summary.malicious);
      setVal('sec-suspicious', summary.suspicious);
      setVal('sec-safe', summary.safe);

      const incRes = await fetch('/api/security/incidents?limit=50');
      const incData = await incRes.json();
      const tbody = document.getElementById('malware-table-body');
      if (tbody && incData.incidents) {
        const verdictColor = (v) => {
          if (v === 'malicious') return 'var(--danger)';
          if (v === 'unknown' || v === 'oversize' || v === 'suspicious') return 'var(--warning)';
          if (v === 'safe') return 'var(--success)';
          return 'var(--text-muted)';
        };
        const shortId = (id) => id ? (id.length > 12 ? id.slice(0, 6) + '...' + id.slice(-4) : id) : '-';

        tbody.innerHTML = incData.incidents.map(inc => `
          <tr>
            <td>${inc.ts ? esc(new Date(inc.ts).toLocaleString('vi-VN')) : '-'}</td>
            <td>${esc(inc.platform)}</td>
            <td><code>${esc(shortId(inc.sender_id))}</code></td>
            <td style="color:${verdictColor(inc.verdict)}; font-weight:600">${esc(inc.verdict)}</td>
            <td>${Number(inc.engines) || '-'}</td>
            <td>${esc(inc.action)}</td>
          </tr>
        `).join('');
      }

      markSynced();
    } catch (e) { console.error('Failed to load security monitoring', e); }
  }

  // =========================================================================
  //  CPU / RAM Charts — enhanced với threshold line plugin
  // =========================================================================
  let cpuChartInstance = null;
  let ramChartInstance = null;

  // Plugin vẽ đường ngưỡng 80% trên chart CPU/RAM
  const thresholdLinePlugin = {
    id: 'thresholdLine',
    afterDraw(chart) {
      const yAxis = chart.scales.y;
      if (!yAxis) return;
      const ctx = chart.ctx;
      const yPos = yAxis.getPixelForValue(80);
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.moveTo(chart.chartArea.left, yPos);
      ctx.lineTo(chart.chartArea.right, yPos);
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText('80%', chart.chartArea.right + 4, yPos + 4);

      ctx.restore();
    }
  };

  // Glassmorphism tooltip config chung cho CPU/RAM
  const metricsTooltip = {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    titleColor: '#f1f5f9',
    bodyColor: '#cbd5e1',
    cornerRadius: 10,
    padding: 12,
  };

  function createMetricsChartConfig(label, color, colorRgb) {
    return {
      type: 'line',
      data: { labels: [], datasets: [{ label, data: [], borderColor: color, backgroundColor: `rgba(${colorRgb}, 0.1)`, fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2, pointHoverRadius: 5 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: 'easeOutQuart' },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { labels: { color: '#e2e8f0', font: { family: "'Inter', sans-serif" } } },
          tooltip: metricsTooltip,
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', maxTicksLimit: 10, font: { family: "'Inter', sans-serif", size: 10 } },
          },
          y: {
            suggestedMax: 100,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', callback: v => v + '%', font: { family: "'Inter', sans-serif", size: 10 } },
          },
        },
      },
      plugins: [thresholdLinePlugin],
    };
  }

  async function loadMetrics() {
    try {
      const res = await fetch('/api/system/metrics');
      const data = await res.json();
      const now = new Date().toLocaleTimeString();

      // ── CPU Chart ──
      if (!cpuChartInstance) {
        const ctx = document.getElementById('cpuChart')?.getContext('2d');
        if (ctx) {
          const config = createMetricsChartConfig('CPU %', '#00f2fe', '0, 242, 254');
          config.data.labels = [now];
          config.data.datasets[0].data = [data.cpu];
          cpuChartInstance = new Chart(ctx, config);
        }
      } else {
        cpuChartInstance.data.labels.push(now);
        cpuChartInstance.data.datasets[0].data.push(data.cpu);
        if (cpuChartInstance.data.labels.length > 20) {
          cpuChartInstance.data.labels.shift();
          cpuChartInstance.data.datasets[0].data.shift();
        }
        cpuChartInstance.update();
      }

      // ── RAM Chart ──
      if (!ramChartInstance) {
        const ctx = document.getElementById('ramChart')?.getContext('2d');
        if (ctx) {
          const config = createMetricsChartConfig('RAM %', '#10b981', '16, 185, 129');
          config.data.labels = [now];
          config.data.datasets[0].data = [data.ram];
          ramChartInstance = new Chart(ctx, config);
        }
      } else {
        ramChartInstance.data.labels.push(now);
        ramChartInstance.data.datasets[0].data.push(data.ram);
        if (ramChartInstance.data.labels.length > 20) {
          ramChartInstance.data.labels.shift();
          ramChartInstance.data.datasets[0].data.shift();
        }
        ramChartInstance.update();
      }

      markSynced();
    } catch (e) { console.error('Failed to load metrics', e); }
  }

  // =========================================================================
  //  File Upload
  // =========================================================================
  const uploadForm = document.getElementById('upload-form');
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('file-input');
    if (!fileInput.files[0]) return;

    const formData = new FormData();
    formData.append('formFile', fileInput.files[0]);

    try {
      const res = await fetch('/api/forms', { method: 'POST', body: formData });
      if (res.ok) {
        fileInput.value = '';
        loadForms();
      }
    } catch (e) { alert('Upload failed'); }
  });

  // ─── Delete Form — globally exposed ─────────────────────────────────────
  window.deleteForm = async (filename) => {
    if (!confirm(`Bạn có chắc muốn xóa file ${filename}?`)) return;
    try {
      const res = await fetch(`/api/forms/${filename}`, { method: 'DELETE' });
      if (res.ok) loadForms();
    } catch (e) { alert('Delete failed'); }
  };

  // =========================================================================
  //  Init — tải dữ liệu ban đầu
  // =========================================================================
  loadStats();
  loadAnalytics();
  loadHealth();
  loadFeedback();
});
