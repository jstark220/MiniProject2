// ── Color map (mirrors script.js) ─────────────────────────────────────────────
const categoryColors = {
    'Individual Stock': { bg: 'rgba(139, 92, 246, 0.8)',  border: '#a78bfa' },
    'Index Fund':       { bg: 'rgba(239, 68, 68, 0.8)',   border: '#f87171' },
    'Bond':             { bg: 'rgba(245, 158, 11, 0.8)',  border: '#fbbf24' },
    'Cash':             { bg: 'rgba(34, 197, 94, 0.8)',   border: '#4ade80' },
    'Real Estate':      { bg: 'rgba(249, 115, 22, 0.8)',  border: '#fb923c' },
    'Other':            { bg: 'rgba(20, 184, 166, 0.8)',  border: '#2dd4bf' },
};

function getColor(category, type) {
    const c = categoryColors[category] || categoryColors['Other'];
    return type === 'border' ? c.border : c.bg;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(value) {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit'
    });
}

function groupByCategory(assets) {
    const map = {};
    assets.forEach(a => {
        if (!map[a.category]) map[a.category] = { category: a.category, amount: 0 };
        map[a.category].amount += a.amount;
    });
    return Object.values(map);
}

function badgeSuffix(category) {
    const map = {
        'Individual Stock': 'stock',
        'Index Fund':       'index',
        'Bond':             'bond',
        'Cash':             'cash',
        'Real Estate':      'realestate',
        'Other':            'other',
    };
    return map[category] || 'other';
}

// ── Load data ─────────────────────────────────────────────────────────────────
const snapshots = JSON.parse(localStorage.getItem('nwt_snapshots') || '[]');

const listEl        = document.getElementById('snapshot-list');
const emptyEl       = document.getElementById('history-empty');
const pickerCard    = document.getElementById('compare-picker-card');
const resultCard    = document.getElementById('compare-result-card');
const resultTitle   = document.getElementById('compare-result-title');
const resultToggles = document.getElementById('compare-result-toggles');
const resultArea    = document.getElementById('compare-result-chart-area');
const resultDelta   = document.getElementById('compare-result-delta');
const selectA       = document.getElementById('compare-a');
const selectB       = document.getElementById('compare-b');
const goBtn         = document.getElementById('compare-go-btn');

Chart.defaults.color       = '#8abfa0';
Chart.defaults.borderColor = '#1f4d30';

if (snapshots.length === 0) {
    emptyEl.classList.remove('hidden');
} else {
    emptyEl.classList.add('hidden');
    populatePicker();

    [...snapshots].reverse().forEach(snapshot => {
        listEl.appendChild(buildSnapshotCard(snapshot));
    });
}

// ── Populate comparison dropdowns ─────────────────────────────────────────────
function populatePicker() {
    if (snapshots.length < 2) return;

    pickerCard.classList.remove('hidden');

    snapshots.forEach((s, i) => {
        const labelText = `${s.label} — ${formatDate(s.date)}`;

        const optA = document.createElement('option');
        optA.value = i;
        optA.textContent = labelText;
        selectA.appendChild(optA);

        const optB = document.createElement('option');
        optB.value = i;
        optB.textContent = labelText;
        selectB.appendChild(optB);
    });

    // Default to two different snapshots
    selectB.selectedIndex = Math.min(1, snapshots.length - 1);
}

// ── Active compare chart instances ────────────────────────────────────────────
let compareInstances  = [];
let compareChartType  = 'pie';
let compareSnapA      = null;
let compareSnapB      = null;

goBtn.addEventListener('click', function () {
    const idxA = parseInt(selectA.value);
    const idxB = parseInt(selectB.value);

    if (idxA === idxB) {
        goBtn.textContent = 'Pick two different snapshots';
        setTimeout(() => { goBtn.textContent = 'Compare'; }, 2000);
        return;
    }

    compareSnapA = snapshots[idxA];
    compareSnapB = snapshots[idxB];

    resultTitle.textContent = `${compareSnapA.label}  vs  ${compareSnapB.label}`;
    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Reset toggle to pie
    resultToggles.querySelectorAll('.compare-toggle').forEach(b => b.classList.remove('active'));
    resultToggles.querySelector('[data-type="pie"]').classList.add('active');
    compareChartType = 'pie';

    renderCompareChart();
});

resultToggles.querySelectorAll('.compare-toggle').forEach(btn => {
    btn.addEventListener('click', function () {
        resultToggles.querySelectorAll('.compare-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        compareChartType = btn.dataset.type;
        renderCompareChart();
    });
});

// ── Render the active comparison chart ───────────────────────────────────────
function renderCompareChart() {
    compareInstances.forEach(c => c.destroy());
    compareInstances = [];

    const snapA       = compareSnapA;
    const snapB       = compareSnapB;
    const groupedA    = groupByCategory(snapA.assets);
    const groupedB    = groupByCategory(snapB.assets);
    const totalA      = snapA.total;
    const totalB      = snapB.total;

    const allCategories = [...new Set([
        ...groupedA.map(g => g.category),
        ...groupedB.map(g => g.category)
    ])];

    const pctsA = allCategories.map(cat => {
        const g = groupedA.find(g => g.category === cat);
        return g ? parseFloat((g.amount / totalA * 100).toFixed(1)) : 0;
    });
    const pctsB = allCategories.map(cat => {
        const g = groupedB.find(g => g.category === cat);
        return g ? parseFloat((g.amount / totalB * 100).toFixed(1)) : 0;
    });

    if (compareChartType === 'pie') {
        resultArea.innerHTML = `
            <div class="compare-dual">
                <div class="compare-dual-item">
                    <p class="compare-dual-label">${snapA.label}</p>
                    <div class="compare-dual-chart"><canvas id="rc-a-pie"></canvas></div>
                </div>
                <div class="compare-dual-item">
                    <p class="compare-dual-label">${snapB.label}</p>
                    <div class="compare-dual-chart"><canvas id="rc-b-pie"></canvas></div>
                </div>
            </div>
        `;
        setTimeout(() => {
            compareInstances.push(makePie('rc-a-pie', groupedA, totalA));
            compareInstances.push(makePie('rc-b-pie', groupedB, totalB));
        }, 0);

    } else if (compareChartType === 'bar') {
        resultArea.innerHTML = `<div class="chart-container" style="height:320px;"><canvas id="rc-bar"></canvas></div>`;
        setTimeout(() => {
            compareInstances.push(makeCompareBar('rc-bar', allCategories, pctsA, pctsB, snapA.label, snapB.label));
        }, 0);

    } else if (compareChartType === 'treemap') {
        resultArea.innerHTML = `
            <div class="compare-dual">
                <div class="compare-dual-item">
                    <p class="compare-dual-label">${snapA.label}</p>
                    <div class="compare-dual-chart"><canvas id="rc-a-tree"></canvas></div>
                </div>
                <div class="compare-dual-item">
                    <p class="compare-dual-label">${snapB.label}</p>
                    <div class="compare-dual-chart"><canvas id="rc-b-tree"></canvas></div>
                </div>
            </div>
        `;
        setTimeout(() => {
            compareInstances.push(makeTreemap('rc-a-tree', groupedA, totalA));
            compareInstances.push(makeTreemap('rc-b-tree', groupedB, totalB));
        }, 0);
    }

    resultDelta.innerHTML = buildDeltaTable(allCategories, pctsA, pctsB, snapA.label, snapB.label);
}

// ── Build a snapshot card ─────────────────────────────────────────────────────
function buildSnapshotCard(snapshot) {
    const card = document.createElement('div');
    card.className = 'card snapshot-card';
    card.dataset.id = snapshot.id;

    card.innerHTML = `
        <div class="section-header">
            <div>
                <h2>${snapshot.label}</h2>
                <span class="snapshot-meta">${formatDate(snapshot.date)} &mdash; ${formatCurrency(snapshot.total)}</span>
            </div>
            <button class="btn-clear delete-btn" data-id="${snapshot.id}">Delete</button>
        </div>
        <div class="snapshot-body">
            <div class="snapshot-chart-wrap">
                <canvas id="pie-${snapshot.id}"></canvas>
            </div>
            <div class="snapshot-table-wrap">
                ${buildSnapshotTable(snapshot.assets)}
            </div>
        </div>
    `;

    setTimeout(() => drawPie(`pie-${snapshot.id}`, snapshot.assets), 0);

    card.querySelector('.delete-btn').addEventListener('click', () => {
        deleteSnapshot(snapshot.id);
        card.remove();
        if (listEl.children.length === 0) {
            emptyEl.classList.remove('hidden');
            pickerCard.classList.add('hidden');
            resultCard.classList.add('hidden');
        }
    });

    return card;
}

// ── Snapshot summary table ────────────────────────────────────────────────────
function buildSnapshotTable(assets) {
    const rows = assets.map(a => `
        <tr>
            <td><span class="asset-badge badge-${badgeSuffix(a.category)}">${a.type}</span></td>
            <td>${a.name || '<span style="color:var(--text-muted)">—</span>'}</td>
            <td>${formatCurrency(a.amount)}</td>
            <td><span class="pct-pill">${a.pct}%</span></td>
        </tr>
    `).join('');

    return `
        <table class="snapshot-table">
            <thead><tr><th>Type</th><th>Label</th><th>Value</th><th>%</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// ── Draw pie for a snapshot card ──────────────────────────────────────────────
function drawPie(canvasId, assets) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const grouped = groupByCategory(assets);
    const total   = assets.reduce((s, a) => s + a.amount, 0);
    makePie(canvasId, grouped, total);
}

// ── Chart factories ───────────────────────────────────────────────────────────
function makePie(canvasId, grouped, total) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    return new Chart(ctx, {
        type: 'pie',
        data: {
            labels: grouped.map(g => g.category),
            datasets: [{
                data:            grouped.map(g => g.amount),
                backgroundColor: grouped.map(g => getColor(g.category, 'bg')),
                borderColor:     '#112418',
                borderWidth:     2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#f0faf4', padding: 10, font: { size: 11 } } },
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
}

function makeTreemap(canvasId, grouped, total) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    return new Chart(ctx, {
        type: 'treemap',
        data: {
            datasets: [{
                label: 'Portfolio',
                data: grouped.map(g => ({ v: g.amount, l: g.category })),
                key: 'v',
                backgroundColor(ctx) {
                    if (ctx.type !== 'data') return 'transparent';
                    return getColor(ctx.raw._data?.l ?? ctx.raw.l, 'bg');
                },
                borderColor(ctx) {
                    if (ctx.type !== 'data') return 'transparent';
                    return getColor(ctx.raw._data?.l ?? ctx.raw.l, 'border');
                },
                borderWidth: 2,
                spacing: 2,
                labels: {
                    display: true,
                    align: 'center',
                    position: 'middle',
                    color: '#f0faf4',
                    font: { size: 11, weight: 'bold' },
                    formatter(ctx) {
                        if (!ctx.raw) return '';
                        const l   = ctx.raw._data?.l ?? ctx.raw.l ?? '';
                        const v   = ctx.raw._data?.v ?? ctx.raw.v ?? 0;
                        const pct = (v / total * 100).toFixed(1);
                        return [l, `${pct}%`];
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

function makeCompareBar(canvasId, categories, pctsA, pctsB, labelA, labelB) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [
                {
                    label: labelA,
                    data: pctsA,
                    backgroundColor: 'rgba(139, 92, 246, 0.75)',
                    borderColor: '#a78bfa',
                    borderWidth: 1,
                    borderRadius: 5,
                },
                {
                    label: labelB,
                    data: pctsB,
                    backgroundColor: 'rgba(82, 183, 136, 0.75)',
                    borderColor: '#52b788',
                    borderWidth: 1,
                    borderRadius: 5,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#f0faf4', font: { size: 13 } } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#f0faf4', font: { size: 12 } } },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: '#1f4d30' },
                    ticks: { color: '#8abfa0', callback: v => v + '%' }
                }
            }
        }
    });
}

// ── Delta table ───────────────────────────────────────────────────────────────
function buildDeltaTable(categories, pctsA, pctsB, labelA, labelB) {
    const rows = categories.map((cat, i) => {
        const delta = (pctsB[i] - pctsA[i]).toFixed(1);
        const sign  = delta > 0 ? '+' : '';
        const cls   = delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : 'delta-flat';
        return `
            <tr>
                <td><span class="asset-badge badge-${badgeSuffix(cat)}">${cat}</span></td>
                <td class="pct-pill">${pctsA[i]}%</td>
                <td class="pct-pill">${pctsB[i]}%</td>
                <td class="${cls}">${sign}${delta}%</td>
            </tr>
        `;
    }).join('');

    return `
        <table class="snapshot-table" style="margin-top:1.25rem;">
            <thead>
                <tr><th>Category</th><th>${labelA} %</th><th>${labelB} %</th><th>Change</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// ── Delete a snapshot ─────────────────────────────────────────────────────────
function deleteSnapshot(id) {
    const updated = snapshots.filter(s => s.id !== id);
    localStorage.setItem('nwt_snapshots', JSON.stringify(updated));
    snapshots.splice(0, snapshots.length, ...updated);
}
