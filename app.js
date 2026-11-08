/**
 * Kashflow Application Logic
 * Native Canvas Charts + LocalStorage Persistence + Financial Analytics
 */

// Global State
const STATE = {
  transactions: [],
  monthlyBudget: 5000000, // Default 5 juta
  activeTab: 'overview',
  theme: 'light',
  filter: {
    search: '',
    type: 'all',
    category: 'all',
    sort: 'newest'
  }
};

const CATEGORY_COLORS = {
  'Makanan': '#F59E0B',
  'Transport': '#3B82F6',
  'Belanja': '#EC4899',
  'Tagihan': '#EF4444',
  'Hiburan': '#8B5CF6',
  'Gaji': '#10B981',
  'Lainnya': '#6B7280'
};

// Seed Data for initial delight
const DEFAULT_TRANSACTIONS = [
  { id: 'tx-1', type: 'income', amount: 8500000, desc: 'Gaji Bulanan', category: 'Gaji', date: getRecentDate(6) },
  { id: 'tx-2', type: 'expense', amount: 1500000, desc: 'Belanja Bulanan Supermarket', category: 'Belanja', date: getRecentDate(5) },
  { id: 'tx-3', type: 'expense', amount: 350000, desc: 'Bayar Tagihan Listrik & WiFi', category: 'Tagihan', date: getRecentDate(4) },
  { id: 'tx-4', type: 'expense', amount: 85000, desc: 'Makan Siang Ramen & Kopi', category: 'Makanan', date: getRecentDate(3) },
  { id: 'tx-5', type: 'expense', amount: 45000, desc: 'Bensin & Tol', category: 'Transport', date: getRecentDate(2) },
  { id: 'tx-6', type: 'expense', amount: 120000, desc: 'Nonton Bioskop Weekend', category: 'Hiburan', date: getRecentDate(1) },
  { id: 'tx-7', type: 'income', amount: 1200000, desc: 'Proyek Desain Freelance', category: 'Gaji', date: getRecentDate(0) }
];

function getRecentDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// Formatting Helpers
function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Storage & API Sync Helpers
async function loadState() {
  const storedTheme = localStorage.getItem('kashflow_theme');
  STATE.theme = storedTheme || 'light';
  applyTheme(STATE.theme);

  // Coba fetch dari backend serverless jika tersedia
  try {
    const res = await fetch('/api');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        STATE.transactions = data.transactions;
        STATE.monthlyBudget = data.monthlyBudget;
        renderApp();
        return;
      }
    }
  } catch (err) {
    console.log('Running in standalone/offline mode, fallback to localStorage');
  }

  // Fallback ke localStorage jika belum ter-deploy ke Vercel
  const storedTx = localStorage.getItem('kashflow_tx');
  const storedBudget = localStorage.getItem('kashflow_budget');
  STATE.transactions = storedTx ? JSON.parse(storedTx) : DEFAULT_TRANSACTIONS;
  STATE.monthlyBudget = storedBudget ? Number(storedBudget) : 5000000;
  renderApp();
}

async function syncTransactionToServer(tx) {
  try {
    await fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx)
    });
  } catch (err) {
    console.warn('Sync server error:', err);
  }
}

async function deleteTransactionFromServer(id) {
  try {
    await fetch(`/api?id=${id}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Delete server error:', err);
  }
}

async function syncBudgetToServer(val) {
  try {
    await fetch('/api?action=save_budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget: val })
    });
  } catch (err) {
    console.warn('Sync budget error:', err);
  }
}

function saveState() {
  localStorage.setItem('kashflow_tx', JSON.stringify(STATE.transactions));
  localStorage.setItem('kashflow_budget', STATE.monthlyBudget.toString());
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const sun = document.getElementById('themeIconSun');
  const moon = document.getElementById('themeIconMoon');
  if (sun && moon) {
    if (t === 'dark') {
      sun.classList.remove('hidden');
      moon.classList.add('hidden');
    } else {
      sun.classList.add('hidden');
      moon.classList.remove('hidden');
    }
  }
}

function toggleTheme() {
  STATE.theme = STATE.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('kashflow_theme', STATE.theme);
  applyTheme(STATE.theme);
  renderCharts();
}

function saveState() {
  localStorage.setItem('kashflow_tx', JSON.stringify(STATE.transactions));
  localStorage.setItem('kashflow_budget', STATE.monthlyBudget.toString());
}

// UI Notification
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

// Lifecycle Init
document.addEventListener('DOMContentLoaded', () => {
  // Jika service worker versi lama nyangkut, unregister dulu agar langsung fetch versi terbaru
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.update();
      }
    });
  }

  loadState();
  initEventListeners();
  renderApp();
  
  // Update header current date
  const now = new Date();
  document.getElementById('currentDateStr').innerText = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  
  // Set default form date to today
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('monthlyBudgetInput').value = STATE.monthlyBudget;
});

// Event Listeners
function initEventListeners() {
  // Sidebar Mobile Toggle
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (sidebarToggleBtn && sidebar && sidebarOverlay) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('hidden', !sidebar.classList.contains('open'));
    });

    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.add('hidden');
    });
  }

  // Theme Switcher
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

  // Navigation Tabs
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Modal Controls
  const modal = document.getElementById('transactionModal');
  const openModalBtn = document.getElementById('openModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const txForm = document.getElementById('transactionForm');

  openModalBtn.addEventListener('click', () => openTxModal());
  closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
  cancelModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
  
  // Form Submission
  txForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleTxSubmit();
  });

  // Budget Form
  document.getElementById('budgetConfigForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = Number(document.getElementById('monthlyBudgetInput').value);
    if (val > 0) {
      STATE.monthlyBudget = val;
      saveState();
      syncBudgetToServer(val);
      renderApp();
      showToast('Target anggaran berhasil diperbarui');
    }
  });

  // Filters & Search
  document.getElementById('searchFilter').addEventListener('input', (e) => {
    STATE.filter.search = e.target.value.toLowerCase();
    renderTransactionsTable();
  });
  document.getElementById('typeFilter').addEventListener('change', (e) => {
    STATE.filter.type = e.target.value;
    renderTransactionsTable();
  });
  document.getElementById('categoryFilter').addEventListener('change', (e) => {
    STATE.filter.category = e.target.value;
    renderTransactionsTable();
  });
  document.getElementById('sortFilter').addEventListener('change', (e) => {
    STATE.filter.sort = e.target.value;
    renderTransactionsTable();
  });

  // CSV Export
  document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);
}

function switchTab(tabId) {
  STATE.activeTab = tabId;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });

  // Tutup sidebar di mobile setelah memilih menu
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
  }

  const titles = {
    overview: 'Ringkasan Finansial',
    transactions: 'Daftar Semua Transaksi',
    analytics: 'Analisis & Indikator Finansial',
    budget: 'Manajemen Batas Anggaran'
  };
  document.getElementById('pageTitle').innerText = titles[tabId] || 'Ringkasan Finansial';

  // Redraw charts if tab becomes visible
  if (tabId === 'overview' || tabId === 'analytics') {
    requestAnimationFrame(() => renderCharts());
  }
}

// Modal Form handling
function openTxModal(editTx = null) {
  const modal = document.getElementById('transactionModal');
  const title = document.getElementById('modalTitle');
  const editIdInput = document.getElementById('editId');
  const txForm = document.getElementById('transactionForm');

  if (editTx) {
    title.innerText = 'Edit Transaksi';
    editIdInput.value = editTx.id;
    document.querySelector(`input[name="txType"][value="${editTx.type}"]`).checked = true;
    document.getElementById('txAmount').value = editTx.amount;
    document.getElementById('txDesc').value = editTx.desc;
    document.getElementById('txCategory').value = editTx.category;
    document.getElementById('txDate').value = editTx.date;
  } else {
    title.innerText = 'Tambah Transaksi Baru';
    editIdInput.value = '';
    txForm.reset();
    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
    document.querySelector('input[name="txType"][value="expense"]').checked = true;
  }

  modal.classList.remove('hidden');
}

function handleTxSubmit() {
  const editId = document.getElementById('editId').value;
  const type = document.querySelector('input[name="txType"]:checked').value;
  const amount = Number(document.getElementById('txAmount').value);
  const desc = document.getElementById('txDesc').value.trim();
  const category = document.getElementById('txCategory').value;
  const date = document.getElementById('txDate').value;

  if (!amount || !desc || !date) return;

  if (editId) {
    const idx = STATE.transactions.findIndex(t => t.id === editId);
    if (idx !== -1) {
      const updated = { id: editId, type, amount, desc, category, date };
      STATE.transactions[idx] = updated;
      syncTransactionToServer(updated);
      showToast('Transaksi berhasil diperbarui');
    }
  } else {
    const newTx = {
      id: 'tx-' + Date.now(),
      type,
      amount,
      desc,
      category,
      date
    };
    STATE.transactions.unshift(newTx);
    syncTransactionToServer(newTx);
    showToast('Transaksi berhasil dicatat');
  }

  saveState();
  document.getElementById('transactionModal').classList.add('hidden');
  renderApp();
}

function deleteTransaction(id) {
  if (confirm('Hapus transaksi ini secara permanen?')) {
    STATE.transactions = STATE.transactions.filter(t => t.id !== id);
    saveState();
    deleteTransactionFromServer(id);
    renderApp();
    showToast('Transaksi telah dihapus');
  }
}

// Master Render Function
function renderApp() {
  renderKPIs();
  renderBudgetPill();
  renderTransactionsTable();
  renderCharts();
  renderAnalytics();
}

function renderKPIs() {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;

  STATE.transactions.forEach(t => {
    if (t.type === 'income') {
      income += t.amount;
      incomeCount++;
    } else {
      expense += t.amount;
    }
  });

  const netBalance = income - expense;
  document.getElementById('totalBalance').innerText = formatRupiah(netBalance);
  document.getElementById('totalIncome').innerText = formatRupiah(income);
  document.getElementById('totalExpense').innerText = formatRupiah(expense);

  // Subtext KPIs
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  document.getElementById('savingsRateText').innerText = `Tingkat Tabungan: ${savingsRate}%`;
  document.getElementById('incomeCount').innerText = `${incomeCount} transaksi masuk`;

  const dailyAvg = Math.round(expense / 30);
  document.getElementById('expenseBurnRate').innerText = `Rata-rata/hari: ${formatRupiah(dailyAvg)}`;
}

function renderBudgetPill() {
  let expense = 0;
  STATE.transactions.forEach(t => {
    if (t.type === 'expense') expense += t.amount;
  });

  const pct = Math.min(100, Math.round((expense / STATE.monthlyBudget) * 100));
  const remaining = Math.max(0, STATE.monthlyBudget - expense);

  document.getElementById('budgetPctText').innerText = `${pct}%`;
  const fill = document.getElementById('budgetProgressBar');
  fill.style.width = `${pct}%`;

  if (pct > 90) {
    fill.style.backgroundColor = 'var(--expense)';
  } else if (pct > 70) {
    fill.style.backgroundColor = 'var(--warning)';
  } else {
    fill.style.backgroundColor = 'var(--income)';
  }

  document.getElementById('budgetRemainingText').innerText = `Sisa: ${formatRupiah(remaining)}`;

  // Tab budget status card
  const detailedCard = document.getElementById('budgetDetailedStatus');
  if (detailedCard) {
    detailedCard.innerHTML = `
      <div style="background: var(--bg-app); padding: 18px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle)">
        <h4 style="margin-bottom: 8px;">Status Limit Pengeluaran</h4>
        <p class="subtext">Target: <strong>${formatRupiah(STATE.monthlyBudget)}</strong> | Realisasi: <strong class="text-expense">${formatRupiah(expense)}</strong></p>
        <div class="progress-bar mt-6" style="height: 10px;">
          <div class="progress-fill" style="width: ${pct}%; background-color: ${pct > 90 ? 'var(--expense)' : 'var(--income)'}"></div>
        </div>
        <p class="subtext mt-6">${pct >= 100 ? '⚠️ Peringatan: Pengeluaran telah melampaui limit anggaran!' : `Aman. Anda masih memiliki kuota pengeluaran sebesar ${formatRupiah(remaining)}.`}</p>
      </div>
    `;
  }
}

// Table Rendering
function renderTransactionsTable() {
  // Recent 5 for overview
  const recentSlice = [...STATE.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const recentTbody = document.getElementById('recentTransactionsBody');
  recentTbody.innerHTML = recentSlice.map(createTableRowHtml).join('');

  // Filtered & Sorted for All Transactions Tab
  let list = [...STATE.transactions];

  if (STATE.filter.search) {
    list = list.filter(t => t.desc.toLowerCase().includes(STATE.filter.search));
  }
  if (STATE.filter.type !== 'all') {
    list = list.filter(t => t.type === STATE.filter.type);
  }
  if (STATE.filter.category !== 'all') {
    list = list.filter(t => t.category === STATE.filter.category);
  }

  if (STATE.filter.sort === 'newest') list.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (STATE.filter.sort === 'oldest') list.sort((a, b) => new Date(a.date) - new Date(b.date));
  if (STATE.filter.sort === 'highest') list.sort((a, b) => b.amount - a.amount);
  if (STATE.filter.sort === 'lowest') list.sort((a, b) => a.amount - b.amount);

  const allTbody = document.getElementById('allTransactionsBody');
  const emptyState = document.getElementById('emptyState');

  if (list.length === 0) {
    allTbody.innerHTML = '';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    allTbody.innerHTML = list.map(createTableRowHtml).join('');
  }
}

function createTableRowHtml(tx) {
  const isIncome = tx.type === 'income';
  return `
    <tr>
      <td class="mono" style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(tx.date)}</td>
      <td style="font-weight: 500;">${escapeHtml(tx.desc)}</td>
      <td><span class="badge-category">${tx.category}</span></td>
      <td><span class="${isIncome ? 'badge-type-income' : 'badge-type-expense'}">${isIncome ? '+ Masuk' : '- Keluar'}</span></td>
      <td class="text-right mono" style="font-weight: 600; color: ${isIncome ? 'var(--income)' : 'var(--expense)'}">
        ${isIncome ? '+' : '-'}${formatRupiah(tx.amount)}
      </td>
      <td class="text-center">
        <button class="action-btn" title="Edit" onclick="editTxById('${tx.id}')">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn delete" title="Hapus" onclick="deleteTransaction('${tx.id}')">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `;
}

window.editTxById = function(id) {
  const item = STATE.transactions.find(t => t.id === id);
  if (item) openTxModal(item);
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}

// Native Canvas Charts Implementation (High-performance, zero heavy external library dependency)
function renderCharts() {
  drawBarChart();
  drawDonutChart();
  drawLineChart();
}

function drawBarChart() {
  const canvas = document.getElementById('barChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Group last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const dataMap = days.map(dStr => {
    let inc = 0, exp = 0;
    STATE.transactions.forEach(t => {
      if (t.date === dStr) {
        if (t.type === 'income') inc += t.amount;
        else exp += t.amount;
      }
    });
    return { date: dStr, inc, exp };
  });

  const maxVal = Math.max(1, ...dataMap.map(d => Math.max(d.inc, d.exp)));
  const paddingBottom = 30;
  const paddingTop = 20;
  const chartHeight = h - paddingBottom - paddingTop;
  const groupWidth = (w - 60) / 7;

  // Draw Grid lines
  const isDark = STATE.theme === 'dark';
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = paddingTop + (chartHeight / 3) * i;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(w - 20, y);
    ctx.stroke();
  }

  // Draw Bars
  const barWidth = 14;
  dataMap.forEach((item, idx) => {
    const centerX = 50 + idx * groupWidth + groupWidth / 2;
    
    // Income Bar
    const incHeight = (item.inc / maxVal) * chartHeight;
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    roundRect(ctx, centerX - barWidth - 2, h - paddingBottom - incHeight, barWidth, incHeight, 4);
    ctx.fill();

    // Expense Bar
    const expHeight = (item.exp / maxVal) * chartHeight;
    ctx.fillStyle = '#E11D48';
    ctx.beginPath();
    roundRect(ctx, centerX + 2, h - paddingBottom - expHeight, barWidth, expHeight, 4);
    ctx.fill();

    // Date Label
    ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'center';
    const dayLabel = new Date(item.date).toLocaleDateString('id-ID', { weekday: 'narrow', day: 'numeric' });
    ctx.fillText(dayLabel, centerX, h - 10);
  });
}

function drawDonutChart() {
  const canvas = document.getElementById('donutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Group expenses by category
  const catTotals = {};
  let totalExpense = 0;
  STATE.transactions.forEach(t => {
    if (t.type === 'expense') {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
      totalExpense += t.amount;
    }
  });

  const legendBox = document.getElementById('categoryLegend');
  legendBox.innerHTML = '';

  if (totalExpense === 0) {
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 75, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.fillText('Belum ada data', w / 2, h / 2 + 4);
    return;
  }

  let startAngle = -Math.PI / 2;
  const centerX = w / 2;
  const centerY = h / 2;
  const radius = 80;
  const innerRadius = 55;

  Object.entries(catTotals).forEach(([cat, val]) => {
    const sliceAngle = (val / totalExpense) * (Math.PI * 2);
    const endAngle = startAngle + sliceAngle;
    const color = CATEGORY_COLORS[cat] || '#6B7280';

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fill();

    startAngle = endAngle;

    // Build Legend Item
    const pct = Math.round((val / totalExpense) * 100);
    const itemEl = document.createElement('div');
    itemEl.className = 'legend-item';
    itemEl.innerHTML = `
      <span><span class="legend-color" style="background:${color}"></span>${cat}</span>
      <span class="mono" style="color:var(--text-muted)">${pct}%</span>
    `;
    legendBox.appendChild(itemEl);
  });

  // Center Text Total
  const isDark = STATE.theme === 'dark';
  ctx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
  ctx.font = 'bold 13px Plus Jakarta Sans';
  ctx.textAlign = 'center';
  ctx.fillText('Total Beban', centerX, centerY - 6);
  ctx.font = '11px JetBrains Mono';
  ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
  ctx.fillText(formatRupiah(totalExpense), centerX, centerY + 14);
}

function drawLineChart() {
  const canvas = document.getElementById('lineChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Accumulate running balance
  const sorted = [...STATE.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const trend = sorted.map(t => {
    running += (t.type === 'income' ? t.amount : -t.amount);
    return { date: t.date, val: running };
  });

  if (trend.length === 0) return;

  const minVal = Math.min(0, ...trend.map(d => d.val));
  const maxVal = Math.max(100000, ...trend.map(d => d.val));
  const range = maxVal - minVal;

  const padding = 40;
  const chartW = w - padding * 2;
  const chartH = h - padding * 2;

  // Background Grid
  const isDark = STATE.theme === 'dark';
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(w - padding, h - padding);
  ctx.stroke();

  // Draw Path
  ctx.strokeStyle = isDark ? '#F59E0B' : '#4F46E5';
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  trend.forEach((pt, i) => {
    const x = padding + (i / (trend.length - 1 || 1)) * chartW;
    const y = h - padding - ((pt.val - minVal) / range) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw Point Circles
  trend.forEach((pt, i) => {
    const x = padding + (i / (trend.length - 1 || 1)) * chartW;
    const y = h - padding - ((pt.val - minVal) / range) * chartH;
    ctx.fillStyle = isDark ? '#F59E0B' : '#4F46E5';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  if (height <= 0) return;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// 50/30/20 Financial Health Model
function renderAnalytics() {
  const ratioBox = document.getElementById('ratioMetrics');
  if (!ratioBox) return;

  let totalIncome = 0;
  let totalExpense = 0;
  STATE.transactions.forEach(t => {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;
  });

  const needsAmount = totalExpense * 0.6; // Estimasi kebutuhan pokok
  const wantsAmount = totalExpense * 0.4; // Estimasi keinginan / hiburan
  const savingsAmount = Math.max(0, totalIncome - totalExpense);

  const needsPct = totalIncome > 0 ? Math.round((needsAmount / totalIncome) * 100) : 0;
  const wantsPct = totalIncome > 0 ? Math.round((wantsAmount / totalIncome) * 100) : 0;
  const savingsPct = totalIncome > 0 ? Math.round((savingsAmount / totalIncome) * 100) : 0;

  ratioBox.innerHTML = `
    <div class="ratio-item">
      <div class="ratio-label-row">
        <span>Kebutuhan Pokok (Target ≤ 50%)</span>
        <span class="mono">${needsPct}% (${formatRupiah(needsAmount)})</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width: ${Math.min(100, needsPct)}%; background: #3B82F6"></div></div>
    </div>
    <div class="ratio-item">
      <div class="ratio-label-row">
        <span>Keinginan & Gaya Hidup (Target ≤ 30%)</span>
        <span class="mono">${wantsPct}% (${formatRupiah(wantsAmount)})</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width: ${Math.min(100, wantsPct)}%; background: #EC4899"></div></div>
    </div>
    <div class="ratio-item">
      <div class="ratio-label-row">
        <span>Tabungan & Investasi (Target ≥ 20%)</span>
        <span class="mono text-income">${savingsPct}% (${formatRupiah(savingsAmount)})</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width: ${Math.min(100, savingsPct)}%; background: #10B981"></div></div>
    </div>
  `;
}

// Export CSV Feature
function exportToCsv() {
  if (STATE.transactions.length === 0) {
    showToast('Tidak ada data transaksi untuk diekspor');
    return;
  }

  const headers = ['ID', 'Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Nominal'];
  const rows = STATE.transactions.map(t => [
    t.id,
    t.date,
    t.type,
    t.category,
    `"${t.desc.replace(/"/g, '""')}"`,
    t.amount
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `kashflow_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('File CSV berhasil diunduh');
}
