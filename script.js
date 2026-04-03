// ── Asset type data ───────────────────────────────────────────────────────────
// Array of supported asset types — add or remove categories here as needed.
const assetTypes = [
    'Individual Stocks',
    'Index Funds',
    'Bonds',
    'Cash',
    'Real Estate',
];

// ── State ─────────────────────────────────────────────────────────────────────
// Each entry: { id, type, name, amount }
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
const totalDisplay = document.getElementById('total-display');

// ── Populate dropdown from array ──────────────────────────────────────────────
// ITERATION 1 INTERACTION: dropdown driven by the assetTypes array above.
assetTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    selectEl.appendChild(option);
});

// ── Form submit: add asset ────────────────────────────────────────────────────
form.addEventListener('submit', function (e) {
    e.preventDefault();

    const type   = selectEl.value;
    const name   = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
        amountInput.focus();
        return;
    }

    assets.push({ id: nextId++, type, name, amount });

    // Reset only the value fields; keep the selected type
    amountInput.value = '';
    nameInput.value   = '';
    amountInput.focus();

    render();
});

// ── Remove a single asset ─────────────────────────────────────────────────────
function removeAsset(id) {
    assets = assets.filter(a => a.id !== id);
    render();
}

// ── Render table ──────────────────────────────────────────────────────────────
function render() {
    if (assets.length === 0) {
        table.classList.add('hidden');
        emptyState.classList.remove('hidden');
        totalDisplay.textContent = '$0.00';
        return;
    }

    table.classList.remove('hidden');
    emptyState.classList.add('hidden');

    tbody.innerHTML = '';

    let total = 0;

    assets.forEach(asset => {
        total += asset.amount;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="asset-badge">${asset.type}</span></td>
            <td>${asset.name || '<span style="color:var(--text-muted)">—</span>'}</td>
            <td>${formatCurrency(asset.amount)}</td>
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
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(value) {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
