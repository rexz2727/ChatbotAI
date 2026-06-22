// Global 401 handling: any API call returning 401 redirects to login
const _originalFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  const res = await _originalFetch(...args);
  if (res.status === 401) {
    window.location = '/login.html';
  }
  return res;
};

document.addEventListener('DOMContentLoaded', () => {
  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await fetch('/api/logout', { method: 'POST' }); } catch (e) {}
      window.location = '/login.html';
    });
  }

  // Navigation
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
      
      // Refresh data based on view
      if(btn.dataset.target === 'dashboard-view') {
        loadStats();
        loadAnalytics();
        loadHealth();
        loadFeedback();
        loadForms();
      }
      if(btn.dataset.target === 'system-view') {
        loadHealth();
        loadMetrics();
        loadLogs();
        loadSecurity();
        loadContainers();
        loadSecurityMonitoring();
      }
    });
  });

  // Sidebar Toggle Logic
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  // Load API Data
  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      document.getElementById('stat-users').innerText = data.totalUsers;
      document.getElementById('stat-messages').innerText = data.totalMessages;
    } catch(e) { console.error('Failed to load stats'); }
  }

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
      if(tbody) tbody.innerHTML = rows;
      
      if(dashBody) {
        dashBody.innerHTML = data.slice(0, 5).map(item => `
          <tr>
            <td>${item.content.substring(0, 50)}${item.content.length > 50 ? '...' : ''}</td>
            <td><code>${item.senderId}</code></td>
          </tr>
        `).join('');
      }
    } catch(e) { console.error('Failed to load feedback'); }
  }

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
    } catch(e) { console.error('Failed to load forms'); }
  }

  let messagesChartInstance = null;
  let topicsChartInstance = null;

  async function loadAnalytics() {
    try {
      const msgRes = await fetch('/api/analytics/messages-by-day');
      const msgData = await msgRes.json();
      const topicRes = await fetch('/api/analytics/topics');
      const topicData = await topicRes.json();

      const msgCtx = document.getElementById('messagesChart').getContext('2d');
      if (messagesChartInstance) messagesChartInstance.destroy();
      messagesChartInstance = new Chart(msgCtx, {
        type: 'line',
        data: {
          labels: msgData.map(d => d.day),
          datasets: [{
            label: 'Số tin nhắn',
            data: msgData.map(d => d.count),
            borderColor: '#00f2fe',
            backgroundColor: 'rgba(0, 242, 254, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#090e17',
            pointBorderColor: '#00f2fe',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#e2e8f0' } }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
          }
        }
      });

      const topicCtx = document.getElementById('topicsChart').getContext('2d');
      if (topicsChartInstance) topicsChartInstance.destroy();
      topicsChartInstance = new Chart(topicCtx, {
        type: 'doughnut',
        data: {
          labels: topicData.map(d => d.topic),
          datasets: [{
            data: topicData.map(d => d.count),
            backgroundColor: ['#00f2fe', '#4facfe', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
            borderColor: '#090e17',
            borderWidth: 2
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#e2e8f0', padding: 20 } }
          },
          cutout: '70%'
        }
      });
    } catch(e) { console.error('Failed to load analytics', e); }
  }

  async function loadHealth() {
    try {
      const res = await fetch('/api/health-details');
      const data = await res.json();
      
      const formatUptime = (seconds) => {
        const d = Math.floor(seconds / (3600*24));
        const h = Math.floor(seconds % (3600*24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        return `${d}d ${h}h ${m}m`;
      };
      
      const formatBytes = (bytes) => {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
      };

      if(document.getElementById('health-uptime')) {
        document.getElementById('health-uptime').innerText = formatUptime(data.uptime);
        document.getElementById('health-memory').innerText = formatBytes(data.memory);
        document.getElementById('health-db').innerText = data.dbStatus;
        document.getElementById('health-chroma').innerText = data.chromaStatus;
        document.getElementById('health-db').style.color = data.dbStatus === 'OK' ? '#10b981' : '#ef4444';
        document.getElementById('health-chroma').style.color = data.chromaStatus === 'OK' ? '#10b981' : '#ef4444';
      }
      
      if(document.getElementById('health-uptime-dash')) {
        document.getElementById('health-uptime-dash').innerText = formatUptime(data.uptime);
        document.getElementById('health-db-dash').innerText = data.dbStatus;
        document.getElementById('health-db-dash').style.color = data.dbStatus === 'OK' ? '#10b981' : '#ef4444';
      }
    } catch(e) { console.error('Failed to load health'); }
  }

  // Poll health every 10 seconds
  setInterval(() => {
    if (document.getElementById('system-view')?.classList.contains('active') || 
        document.getElementById('dashboard-view')?.classList.contains('active')) {
      loadHealth();
    }
  }, 10000);

  // Poll APM and System every 3 seconds
  setInterval(() => {
    if (document.getElementById('system-view')?.classList.contains('active')) {
      loadLogs();
      loadSecurity();
      loadMetrics();
      loadContainers();
      loadSecurityMonitoring();
    }
  }, 3000);

  async function loadContainers() {
    try {
      const res = await fetch('/api/system/containers');
      const data = await res.json();
      const tbody = document.getElementById('containers-table-body');
      if (tbody && data.containers) {
        tbody.innerHTML = data.containers.map(c => `
          <tr>
            <td style="font-weight:bold; color:var(--primary)">${c.name}</td>
            <td style="color:${c.state === 'running' ? 'var(--success)' : 'var(--danger)'}">
              ${c.state === 'running' ? '🟢 Đang chạy' : '🔴 Dừng'}
            </td>
            <td>${c.status}</td>
          </tr>
        `).join('');
      }
    } catch(e) { console.error('Failed to load containers', e); }
  }

  async function loadLogs() {
    try {
      const res = await fetch('/api/system/logs');
      const data = await res.json();
      const terminal = document.getElementById('log-terminal');
      if (terminal && data.logs) {
        terminal.innerHTML = data.logs.map(l => `<div>${l}</div>`).join('');
        terminal.scrollTop = terminal.scrollHeight;
      }
    } catch(e) { console.error('Failed to load logs', e); }
  }

  async function loadSecurity() {
    try {
      const res = await fetch('/api/system/security');
      const data = await res.json();
      const tbody = document.getElementById('security-table-body');
      if (tbody && data.incidents) {
        tbody.innerHTML = data.incidents.map(inc => `<tr><td style="color: var(--danger)">${inc}</td></tr>`).join('');
      }
    } catch(e) { console.error('Failed to load security incidents', e); }
  }

  async function loadSecurityMonitoring() {
    try {
      const sumRes = await fetch('/api/security/summary');
      const summary = await sumRes.json();
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val ?? 0; };
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
        // Escape: dữ liệu sự cố (sender_id, platform...) bắt nguồn từ webhook bên ngoài → chống stored XSS khi render vào admin
        const esc = (s) => String(s ?? '-').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
    } catch(e) { console.error('Failed to load security monitoring', e); }
  }

  let cpuChartInstance = null;
  let ramChartInstance = null;

  async function loadMetrics() {
    try {
      const res = await fetch('/api/system/metrics');
      const data = await res.json();
      const now = new Date().toLocaleTimeString();

      if (!cpuChartInstance) {
        const ctx = document.getElementById('cpuChart')?.getContext('2d');
        if (ctx) {
          cpuChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: [now], datasets: [{ label: 'CPU %', data: [data.cpu], borderColor: '#00f2fe', backgroundColor: 'rgba(0, 242, 254, 0.1)', fill: true }] },
            options: { responsive: true, maintainAspectRatio: false }
          });
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

      if (!ramChartInstance) {
        const ctx = document.getElementById('ramChart')?.getContext('2d');
        if (ctx) {
          ramChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: [now], datasets: [{ label: 'RAM %', data: [data.ram], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true }] },
            options: { responsive: true, maintainAspectRatio: false }
          });
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
    } catch(e) { console.error('Failed to load metrics', e); }
  }

  // File Upload
  const uploadForm = document.getElementById('upload-form');
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('file-input');
    if (!fileInput.files[0]) return;
    
    const formData = new FormData();
    formData.append('formFile', fileInput.files[0]);
    
    try {
      const res = await fetch('/api/forms', { method: 'POST', body: formData });
      if(res.ok) {
        fileInput.value = '';
        loadForms();
      }
    } catch(e) { alert('Upload failed'); }
  });

  // Delete Form globally exposed
  window.deleteForm = async (filename) => {
    if(!confirm(`Bạn có chắc muốn xóa file ${filename}?`)) return;
    try {
      const res = await fetch(`/api/forms/${filename}`, { method: 'DELETE' });
      if(res.ok) loadForms();
    } catch(e) { alert('Delete failed'); }
  };

  // Init
  loadStats();
  loadAnalytics();
  loadHealth();
  loadFeedback();
});
