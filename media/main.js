const vscode = acquireVsCodeApi();
let currentPage = 0;
const gridDiv = document.getElementById('grid');

const editor = document.getElementById('editor');
editor.value = 'df';
editor.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText('    ', start, end, 'end');
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const line = value.slice(lineStart, start);
    const indentMatch = line.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : '';
    editor.setRangeText('\n' + indent, start, end, 'end');
  } else if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEndIdx = value.indexOf('\n', end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const lines = value.slice(lineStart, lineEnd).split('\n');
    const allCommented = lines.every(l => l.trim().startsWith('#'));
    const newLines = lines.map(l =>
      allCommented ? l.replace(/^(\s*)#\s?/, '$1') : l.replace(/^(\s*)/, '$1# ')
    );
    editor.value =
      value.slice(0, lineStart) + newLines.join('\n') + value.slice(lineEnd);
    editor.selectionStart = lineStart;
    editor.selectionEnd = lineStart + newLines.join('\n').length;
  }
});
request(0);

function getExpr() {
  return editor.value || 'df';
}

const filterSvg =
  '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M3 4h18l-7 8v6l-4 2v-8z"/></svg>';

let menuDiv;
function openFilterMenu(colId, button) {
  closeMenu();
  menuDiv = document.createElement('div');
  menuDiv.className = 'filter-menu';
  menuDiv.innerHTML =
    '<button data-action="asc">Sort Asc</button>' +
    '<button data-action="desc">Sort Desc</button>' +
    '<input class="filter-input" placeholder="Filter..." />' +
    '<button data-action="apply">Apply</button>';
  document.body.appendChild(menuDiv);
  const rect = button.getBoundingClientRect();
  menuDiv.style.left = rect.left + 'px';
  menuDiv.style.top = rect.bottom + 'px';

  menuDiv
    .querySelector('[data-action="asc"]')
    .addEventListener('click', () => {
      applySort(colId, false);
      closeMenu();
    });
  menuDiv
    .querySelector('[data-action="desc"]')
    .addEventListener('click', () => {
      applySort(colId, true);
      closeMenu();
    });
  menuDiv
    .querySelector('[data-action="apply"]')
    .addEventListener('click', () => {
      const val = menuDiv.querySelector('.filter-input').value;
      if (val) {
        applyFilter(colId, val);
      }
      closeMenu();
    });
}

function closeMenu() {
  if (menuDiv) {
    menuDiv.remove();
    menuDiv = null;
  }
}

document.addEventListener('click', e => {
  if (menuDiv && !menuDiv.contains(e.target)) {
    closeMenu();
  }
});

function request(page) {
  const pageSize = parseInt(document.getElementById('pageSize').value) || 100;
  const expr = getExpr();
  vscode.postMessage({ type: 'load', page, pageSize, expr });
}

function applySort(colId, descending) {
  let expr = getExpr();
  expr = expr.replace(/\.sort\([^)]*\)/g, '');
  expr += `.sort("${colId}"${descending ? ', descending=True' : ''})`;
  editor.value = expr;
  request(0);
}

function applyFilter(colId, value) {
  let expr = getExpr();
  expr += `.filter(pl.col("${colId}").str.contains("${value}"))`;
  editor.value = expr;
  request(0);
}

document.getElementById('nextBtn').addEventListener('click', () => request(currentPage + 1));
document.getElementById('prevBtn').addEventListener('click', () => request(Math.max(0, currentPage - 1)));
document.getElementById('gotoBtn').addEventListener('click', () => {
  const p = parseInt(document.getElementById('pageNumber').value) - 1;
  request(p);
});
document.getElementById('exprBtn').addEventListener('click', () => request(0));

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'data') {
    currentPage = msg.page;
    document.getElementById('pageNumber').value = msg.page + 1;
    renderTable(msg.columns, msg.rows);
    document.getElementById('status').textContent =
      'Showing ' + (msg.page * msg.pageSize + 1) + '-' +
      (msg.page * msg.pageSize + msg.rows.length) + ' of ' + msg.totalRows;
  } else if (msg.type === 'error') {
    document.getElementById('status').textContent = msg.error;
  }
});

function renderTable(columns, rows) {
  gridDiv.innerHTML = '';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  columns.forEach(c => {
    const th = document.createElement('th');
    th.classList.add('custom-header');
    const label = document.createElement('span');
    label.textContent = c;
    th.appendChild(label);
    const btn = document.createElement('button');
    btn.className = 'custom-header-button';
    btn.type = 'button';
    btn.innerHTML = filterSvg;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openFilterMenu(c, btn);
    });
    th.appendChild(btn);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    columns.forEach(c => {
      const td = document.createElement('td');
      td.textContent = r[c];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  gridDiv.appendChild(table);
}