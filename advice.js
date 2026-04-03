// ── Expert allocation frameworks ───────────────────────────────────────────────
// All percentages are targets (0–100). Categories map to the user's asset groups.
// equities = Individual Stock + Index Fund combined
const frameworks = [
    {
        name:   'Conservative',
        source: 'Vanguard Target Retirement (near-retirement profile)',
        url:    'https://investor.vanguard.com/investor-resources-education/article/target-date-funds-explained',
        desc:   'Suited for investors within 5–10 years of retirement, prioritising capital preservation over growth.',
        targets: { equities: 30, bonds: 50, cash: 10, realEstate: 10 },
    },
    {
        name:   'Moderate (Balanced)',
        source: 'Fidelity 60/40 Model Portfolio',
        url:    'https://www.fidelity.com/viewpoints/investing-ideas/asset-allocation',
        desc:   'The classic balanced portfolio for investors with a medium risk tolerance and a 10–20 year horizon.',
        targets: { equities: 60, bonds: 30, cash: 5, realEstate: 5 },
    },
    {
        name:   'Aggressive (Growth)',
        source: 'Vanguard Target Retirement 2060 Fund',
        url:    'https://investor.vanguard.com/investor-resources-education/article/target-date-funds-explained',
        desc:   'For younger investors with a long time horizon who can tolerate higher short-term volatility.',
        targets: { equities: 85, bonds: 10, cash: 2, realEstate: 3 },
    },
    {
        name:   'Bogleheads Three-Fund',
        source: 'Bogleheads.org — Three-Fund Portfolio',
        url:    'https://www.bogleheads.org/wiki/Three-fund_portfolio',
        desc:   'A simple, low-cost portfolio using broad index funds. Emphasises index funds over individual stocks.',
        targets: { equities: 70, bonds: 20, cash: 10, realEstate: 0 },
        note:   'This model does not include real estate. Any real estate allocation shifts weight from equities.',
    },
];

const resources = [
    { title: 'Vanguard — How to choose an asset allocation', url: 'https://investor.vanguard.com/investor-resources-education/article/target-date-funds-explained' },
    { title: 'Fidelity — Asset allocation by age and risk', url: 'https://www.fidelity.com/viewpoints/investing-ideas/asset-allocation' },
    { title: 'Bogleheads Wiki — Three-Fund Portfolio', url: 'https://www.bogleheads.org/wiki/Three-fund_portfolio' },
    { title: 'Investopedia — Modern Portfolio Theory', url: 'https://www.investopedia.com/terms/m/modernportfoliotheory.asp' },
    { title: 'SEC Investor.gov — Asset Allocation', url: 'https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-4' },
];

// ── Load latest snapshot ───────────────────────────────────────────────────────
const snapshots = JSON.parse(localStorage.getItem('nwt_snapshots') || '[]');
const latest    = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

const emptyEl    = document.getElementById('advice-empty');
const summaryCard = document.getElementById('snapshot-summary-card');
const frameworksCard = document.getElementById('frameworks-card');
const recsCard   = document.getElementById('recs-card');
const resourcesCard = document.getElementById('resources-card');

if (!latest) {
    emptyEl.classList.remove('hidden');
} else {
    summaryCard.classList.remove('hidden');
    frameworksCard.classList.remove('hidden');
    recsCard.classList.remove('hidden');
    resourcesCard.classList.remove('hidden');

    const userAlloc = computeUserAllocation(latest);
    renderSummary(latest, userAlloc);
    renderFrameworks(userAlloc);
    renderRecommendations(userAlloc, latest);
    renderResources();
}

// ── Compute user's grouped allocation ─────────────────────────────────────────
function computeUserAllocation(snapshot) {
    const totals = { equities: 0, bonds: 0, cash: 0, realEstate: 0, other: 0 };

    snapshot.assets.forEach(a => {
        switch (a.category) {
            case 'Individual Stock':
            case 'Index Fund':
                totals.equities  += a.amount; break;
            case 'Bond':
                totals.bonds     += a.amount; break;
            case 'Cash':
                totals.cash      += a.amount; break;
            case 'Real Estate':
                totals.realEstate += a.amount; break;
            default:
                totals.other     += a.amount;
        }
    });

    const total = snapshot.total;
    const pct   = v => total > 0 ? parseFloat((v / total * 100).toFixed(1)) : 0;

    return {
        equities:   { amount: totals.equities,   pct: pct(totals.equities)   },
        bonds:      { amount: totals.bonds,       pct: pct(totals.bonds)      },
        cash:       { amount: totals.cash,        pct: pct(totals.cash)       },
        realEstate: { amount: totals.realEstate,  pct: pct(totals.realEstate) },
        other:      { amount: totals.other,       pct: pct(totals.other)      },
        total,
    };
}

// ── Summary pills ──────────────────────────────────────────────────────────────
function renderSummary(snapshot, alloc) {
    document.getElementById('snapshot-summary-meta').textContent =
        `${snapshot.label} — ${formatDate(snapshot.date)} — ${formatCurrency(snapshot.total)}`;

    const pillDefs = [
        { label: 'Equities',    key: 'equities',   color: 'rgba(139,92,246,0.8)' },
        { label: 'Bonds',       key: 'bonds',       color: 'rgba(245,158,11,0.8)' },
        { label: 'Cash',        key: 'cash',        color: 'rgba(34,197,94,0.8)'  },
        { label: 'Real Estate', key: 'realEstate',  color: 'rgba(249,115,22,0.8)' },
        { label: 'Other',       key: 'other',       color: 'rgba(20,184,166,0.8)' },
    ];

    const container = document.getElementById('allocation-pills');
    pillDefs.forEach(p => {
        if (alloc[p.key].pct === 0) return;
        const pill = document.createElement('div');
        pill.className = 'alloc-pill';
        pill.innerHTML = `
            <span class="alloc-dot" style="background:${p.color}"></span>
            <span class="alloc-pill-label">${p.label}</span>
            <span class="alloc-pill-pct">${alloc[p.key].pct}%</span>
        `;
        container.appendChild(pill);
    });
}

// ── Framework comparison cards ─────────────────────────────────────────────────
function renderFrameworks(alloc) {
    const container = document.getElementById('framework-list');

    frameworks.forEach(fw => {
        const keys = ['equities', 'bonds', 'cash', 'realEstate'];
        const categoryLabels = {
            equities: 'Equities', bonds: 'Bonds', cash: 'Cash', realEstate: 'Real Estate'
        };

        const rows = keys.map(key => {
            const userPct   = alloc[key].pct;
            const targetPct = fw.targets[key];
            const delta     = parseFloat((userPct - targetPct).toFixed(1));
            const absDelta  = Math.abs(delta);
            const direction = delta > 0 ? 'over' : delta < 0 ? 'under' : 'on-target';
            const barWidth  = Math.min(absDelta * 2, 100); // scale for visual

            return `
                <div class="fw-row">
                    <div class="fw-row-label">${categoryLabels[key]}</div>
                    <div class="fw-row-numbers">
                        <span class="fw-yours">${userPct}%</span>
                        <span class="fw-arrow">→</span>
                        <span class="fw-target">target ${targetPct}%</span>
                    </div>
                    <div class="fw-bar-wrap">
                        <div class="fw-bar fw-bar-${direction}" style="width:${barWidth}%"></div>
                        <span class="fw-delta fw-delta-${direction}">
                            ${direction === 'on-target' ? 'On target' : (delta > 0 ? '+' : '') + delta + '%'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        const card = document.createElement('div');
        card.className = 'framework-card';
        card.innerHTML = `
            <div class="fw-header">
                <div>
                    <span class="fw-name">${fw.name}</span>
                    <a class="fw-source" href="${fw.url}" target="_blank" rel="noopener">${fw.source} ↗</a>
                </div>
            </div>
            <p class="fw-desc">${fw.desc}${fw.note ? ' <em>' + fw.note + '</em>' : ''}</p>
            <div class="fw-rows">${rows}</div>
        `;
        container.appendChild(card);
    });
}

// ── Tailored recommendations ───────────────────────────────────────────────────
function renderRecommendations(alloc, snapshot) {
    // Find the closest framework by least total deviation
    let bestFw    = null;
    let bestScore = Infinity;

    frameworks.forEach(fw => {
        const score = ['equities','bonds','cash','realEstate'].reduce((sum, key) => {
            return sum + Math.abs(alloc[key].pct - fw.targets[key]);
        }, 0);
        if (score < bestScore) { bestScore = score; bestFw = fw; }
    });

    document.getElementById('recs-subtitle').textContent =
        `Your allocation is closest to the ${bestFw.name} model. Here's what the framework suggests adjusting.`;

    const recs  = [];
    const keys  = ['equities', 'bonds', 'cash', 'realEstate'];
    const labels = { equities: 'equities', bonds: 'bonds', cash: 'cash', realEstate: 'real estate' };

    keys.forEach(key => {
        const delta = parseFloat((alloc[key].pct - bestFw.targets[key]).toFixed(1));
        if (Math.abs(delta) < 2) return; // ignore negligible differences

        if (delta > 0) {
            recs.push({
                type: 'reduce',
                text: `Reduce <strong>${labels[key]}</strong> by ~${Math.abs(delta)}% (currently ${alloc[key].pct}%, target ${bestFw.targets[key]}%).`,
            });
        } else {
            recs.push({
                type: 'increase',
                text: `Increase <strong>${labels[key]}</strong> by ~${Math.abs(delta)}% (currently ${alloc[key].pct}%, target ${bestFw.targets[key]}%).`,
            });
        }
    });

    if (alloc.other.pct > 5) {
        recs.push({
            type: 'neutral',
            text: `You have <strong>${alloc.other.pct}%</strong> in uncategorised assets. Consider classifying these to get a more accurate comparison.`,
        });
    }

    if (recs.length === 0) {
        recs.push({ type: 'increase', text: 'Your allocation closely matches the ' + bestFw.name + ' model. No major adjustments recommended.' });
    }

    const list = document.getElementById('rec-list');
    recs.forEach(r => {
        const li = document.createElement('li');
        li.className = `rec-item rec-${r.type}`;
        li.innerHTML = r.text;
        list.appendChild(li);
    });
}

// ── Resources ─────────────────────────────────────────────────────────────────
function renderResources() {
    const list = document.getElementById('resource-list');
    resources.forEach(r => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${r.url}" target="_blank" rel="noopener" class="resource-link">${r.title} ↗</a>`;
        list.appendChild(li);
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(value) {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
}
