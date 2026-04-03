// ── Asset type data ───────────────────────────────────────────────────────────
// Array of supported asset types — add or remove categories here as needed.
const assetTypes = [
    'Individual Stock',
    'Index Fund',
    'Bond',
    'Cash',
    'Real Estate',
    'Other',
];

// ── Badge color map ───────────────────────────────────────────────────────────
// Maps each dropdown category to a CSS class on the badge.
const categoryClass = {
    'Individual Stock': 'badge-stock',
    'Index Fund':       'badge-index',
    'Bond':             'badge-bond',
    'Cash':             'badge-cash',
    'Real Estate':      'badge-realestate',
    'Other':            'badge-other',
};

// ── Chart colors (rgba values for Chart.js) ───────────────────────────────────
const categoryColors = {
    'Individual Stock': { bg: 'rgba(139, 92, 246, 0.8)',  border: '#a78bfa' },
    'Index Fund':       { bg: 'rgba(239, 68, 68, 0.8)',   border: '#f87171' },
    'Bond':             { bg: 'rgba(245, 158, 11, 0.8)',  border: '#fbbf24' },
    'Cash':             { bg: 'rgba(34, 197, 94, 0.8)',   border: '#4ade80' },
    'Real Estate':      { bg: 'rgba(249, 115, 22, 0.8)',  border: '#fb923c' },
    'Other':            { bg: 'rgba(20, 184, 166, 0.8)',  border: '#2dd4bf' },
};

function getCategoryColor(category, type) {
    const c = categoryColors[category] || categoryColors['Other'];
    return type === 'border' ? c.border : c.bg;
}

// ── Chart state ───────────────────────────────────────────────────────────────
let chartInstance    = null;
let currentChartType = 'pie';

// ── State ─────────────────────────────────────────────────────────────────────
// Each entry: { id, type, category, name, amount }
// type     = display label (custom text for "Other")
// category = original dropdown value (used for color)
let assets = [];
let nextId  = 1;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const selectEl    = document.getElementById('asset-type');
const nameInput   = document.getElementById('asset-name');
const amountInput = document.getElementById('asset-amount');
const form        = document.getElementById('asset-form');
const tbody       = document.getElementById('asset-tbody');
const table       = document.getElementById('asset-table');
const emptyState  = document.getElementById('empty-state');
const totalDisplay  = document.getElementById('total-display');
const otherInput    = document.getElementById('other-type');
const clearAllBtn    = document.getElementById('clear-all');
const saveSection    = document.getElementById('save-section');
const snapshotLabel  = document.getElementById('snapshot-label');
const saveBtn        = document.getElementById('save-btn');
const vizSection    = document.getElementById('viz-section');
const chartCanvas   = document.getElementById('chart-canvas');
const chartBtns     = document.querySelectorAll('.btn-chart');

// ── Save snapshot ─────────────────────────────────────────────────────────────
saveBtn.addEventListener('click', function () {
    if (assets.length === 0) return;

    const label    = snapshotLabel.value.trim() || formatDate(new Date());
    const total    = assets.reduce((s, a) => s + a.amount, 0);
    const snapshot = {
        id:    Date.now(),
        label,
        date:  new Date().toISOString(),
        total,
        assets: assets.map(a => ({
            type:     a.type,
            category: a.category,
            name:     a.name,
            amount:   a.amount,
            pct:      parseFloat((a.amount / total * 100).toFixed(1)),
        }))
    };

    const existing = JSON.parse(localStorage.getItem('nwt_snapshots') || '[]');
    existing.push(snapshot);
    localStorage.setItem('nwt_snapshots', JSON.stringify(existing));

    snapshotLabel.value = '';
    saveBtn.textContent = 'Saved!';
    setTimeout(() => { saveBtn.textContent = 'Save Snapshot'; }, 1500);
});

// ── Chart type toggle ─────────────────────────────────────────────────────────
chartBtns.forEach(btn => {
    btn.addEventListener('click', function () {
        chartBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentChartType = btn.dataset.chart;
        renderChart();
    });
});

// ── Populate dropdown from array ──────────────────────────────────────────────
// ITERATION 1 INTERACTION: dropdown driven by the assetTypes array above.
assetTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    selectEl.appendChild(option);
});

// ── Show/hide the "Other" text input ─────────────────────────────────────────
selectEl.addEventListener('change', function () {
    if (selectEl.value === 'Other') {
        otherInput.classList.remove('hidden');
        otherInput.focus();
    } else {
        otherInput.classList.add('hidden');
        otherInput.value = '';
    }
});

// ── Form submit: add asset ────────────────────────────────────────────────────
form.addEventListener('submit', function (e) {
    e.preventDefault();

    const category = selectEl.value;
    let type       = category;

    if (category === 'Other') {
        const customType = otherInput.value.trim();
        if (!customType) {
            otherInput.focus();
            return;
        }
        type = customType;
    }

    const name   = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
        amountInput.focus();
        return;
    }

    assets.push({ id: nextId++, type, category, name, amount });

    // Reset value fields; keep the selected type
    amountInput.value = '';
    nameInput.value   = '';
    otherInput.value  = '';
    amountInput.focus();

    render();
});

// ── Clear all assets ──────────────────────────────────────────────────────────
clearAllBtn.addEventListener('click', function () {
    assets = [];
    render();
});

// ── Remove a single asset ─────────────────────────────────────────────────────
function removeAsset(id) {
    assets = assets.filter(a => a.id !== id);
    render();
}

// ── Group assets by category ──────────────────────────────────────────────────
function groupByCategory() {
    const map = {};
    assets.forEach(asset => {
        if (!map[asset.category]) map[asset.category] = { category: asset.category, amount: 0 };
        map[asset.category].amount += asset.amount;
    });
    return Object.values(map);
}

// ── Render chart ──────────────────────────────────────────────────────────────
function renderChart() {
    if (assets.length === 0) {
        vizSection.classList.add('hidden');
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
        return;
    }

    vizSection.classList.remove('hidden');
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    const grouped      = groupByCategory();
    const labels       = grouped.map(g => g.category);
    const values       = grouped.map(g => g.amount);
    const bgColors     = grouped.map(g => getCategoryColor(g.category, 'bg'));
    const borderColors = grouped.map(g => getCategoryColor(g.category, 'border'));
    const total        = values.reduce((s, v) => s + v, 0);
    const ctx          = chartCanvas.getContext('2d');

    Chart.defaults.color       = '#8abfa0';
    Chart.defaults.borderColor = '#1f4d30';

    if (currentChartType === 'pie') {
        chartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: bgColors,
                    borderColor: '#112418',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#f0faf4', padding: 16, font: { size: 13 } }
                    },
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                const pct = (ctx.parsed / total * 100).toFixed(1);
                                return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });

    } else if (currentChartType === 'bar') {
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Value',
                    data: values,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    borderRadius: 6,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                const pct = (ctx.parsed.x / total * 100).toFixed(1);
                                return ` ${formatCurrency(ctx.parsed.x)} (${pct}%)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#1f4d30' },
                        ticks: {
                            color: '#8abfa0',
                            callback: v => v >= 1000000 ? '$' + (v / 1000000).toFixed(1) + 'M'
                                        : v >= 1000    ? '$' + (v / 1000).toFixed(0) + 'K'
                                        : '$' + v
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#f0faf4', font: { size: 13 } }
                    }
                }
            }
        });

    } else if (currentChartType === 'treemap') {
        chartInstance = new Chart(ctx, {
            type: 'treemap',
            data: {
                datasets: [{
                    label: 'Portfolio',
                    data: grouped.map(g => ({ v: g.amount, l: g.category })),
                    key: 'v',
                    backgroundColor(ctx) {
                        if (ctx.type !== 'data') return 'transparent';
                        return getCategoryColor(ctx.raw._data?.l ?? ctx.raw.l, 'bg');
                    },
                    borderColor(ctx) {
                        if (ctx.type !== 'data') return 'transparent';
                        return getCategoryColor(ctx.raw._data?.l ?? ctx.raw.l, 'border');
                    },
                    borderWidth: 2,
                    spacing: 3,
                    labels: {
                        display: true,
                        align: 'center',
                        position: 'middle',
                        color: '#f0faf4',
                        font: { size: 13, weight: 'bold' },
                        formatter(ctx) {
                            if (!ctx.raw) return '';
                            const l   = ctx.raw._data?.l ?? ctx.raw.l ?? '';
                            const v   = ctx.raw._data?.v ?? ctx.raw.v ?? 0;
                            const pct = (v / total * 100).toFixed(1);
                            return [l, formatCurrency(v), `${pct}%`];
                        }
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title() { return ''; },
                            label(ctx) {
                                const raw = ctx.raw._data ?? ctx.raw;
                                const pct = (raw.v / total * 100).toFixed(1);
                                return `${raw.l}: ${formatCurrency(raw.v)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// ── Render table ──────────────────────────────────────────────────────────────
function render() {
    if (assets.length === 0) {
        table.classList.add('hidden');
        emptyState.classList.remove('hidden');
        totalDisplay.textContent = '$0.00';
        clearAllBtn.classList.add('hidden');
        saveSection.classList.add('hidden');
        localStorage.removeItem('nwt_current');
        return;
    }

    table.classList.remove('hidden');
    emptyState.classList.add('hidden');
    clearAllBtn.classList.remove('hidden');
    saveSection.classList.remove('hidden');

    tbody.innerHTML = '';

    const total = assets.reduce((sum, asset) => sum + asset.amount, 0);

    assets.forEach(asset => {
        const pct = (asset.amount / total * 100).toFixed(1);

        const tr = document.createElement('tr');
        const badgeClass = categoryClass[asset.category] || 'badge-other';
        tr.innerHTML = `
            <td><span class="asset-badge ${badgeClass}">${asset.type}</span></td>
            <td>${asset.name || '<span style="color:var(--text-muted)">—</span>'}</td>
            <td>${formatCurrency(asset.amount)}</td>
            <td><span class="pct-pill">${pct}%</span></td>
            <td>
                <button class="btn-remove" data-id="${asset.id}" title="Remove">Remove</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    totalDisplay.textContent = formatCurrency(total);

    // Attach remove listeners after rendering
    tbody.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => removeAsset(Number(btn.dataset.id)));
    });

    // Sync current portfolio to localStorage for history page comparison
    const currentTotal = assets.reduce((s, a) => s + a.amount, 0);
    localStorage.setItem('nwt_current', JSON.stringify({
        total: currentTotal,
        assets: assets.map(a => ({
            type:     a.type,
            category: a.category,
            name:     a.name,
            amount:   a.amount,
            pct:      parseFloat((a.amount / currentTotal * 100).toFixed(1)),
        }))
    }));

    renderChart();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(value) {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
