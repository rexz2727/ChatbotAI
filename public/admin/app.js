document.addEventListener('DOMContentLoaded', () => {
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
      if(btn.dataset.target === 'dashboard-view') loadStats();
      if(btn.dataset.target === 'feedback-view') loadFeedback();
      if(btn.dataset.target === 'forms-view') loadForms();
    });
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
      tbody.innerHTML = data.map(item => `
        <tr>
          <td>${new Date(item.timestamp).toLocaleString('vi-VN')}</td>
          <td><code>${item.senderId}</code></td>
          <td>${item.content}</td>
        </tr>
      `).join('');
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
});
