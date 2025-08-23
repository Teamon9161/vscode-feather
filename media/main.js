const vscode = acquireVsCodeApi();
let currentPage = 0;
const gridDiv = document.getElementById('grid');
let currentColumns = [];
let currentRows = [];
const selectedCols = new Set();

const editor = document.getElementById('editor');
editor.value = 'df';
editor.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText('    ', start, end, 'end');
  } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    request(0);
  } else if (e.key.toLowerCase() === 'e' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.slice(start, end);
    request(0, selected.trim() ? selected : undefined);
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

const columnColor = i => `hsl(${(i * 45) % 360} 40% 55%)`;

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

function request(page, exprOverride) {
  const pageSize = parseInt(document.getElementById('pageSize').value) || 100;
  const expr = exprOverride ?? getExpr();
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
  expr += `.filter(col("${colId}").cast(str).str.contains("${value}"))`;
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
  currentColumns = columns;
  currentRows = rows;
  selectedCols.clear();
  gridDiv.innerHTML = '';
  const table = document.createElement('table');
  const colgroup = document.createElement('colgroup');
  columns.forEach(() => {
    const col = document.createElement('col');
    colgroup.appendChild(col);
  });
  table.appendChild(colgroup);

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  columns.forEach((c, i) => {
    const th = document.createElement('th');
    const content = document.createElement('div');
    content.className = 'custom-header';
    const label = document.createElement('span');
    label.textContent = c;
    label.style.color = columnColor(i);
    content.appendChild(label);
    const btn = document.createElement('button');
    btn.className = 'custom-header-button';
    btn.type = 'button';
    btn.innerHTML = filterSvg;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openFilterMenu(c, btn);
    });
    content.appendChild(btn);
    th.appendChild(content);
    th.addEventListener('click', e => handleColumnClick(e, i, th, headerRow));
    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    resizer.addEventListener('mousedown', e => initResize(e, i, colgroup, th));
    resizer.addEventListener('dblclick', e => {
      e.stopPropagation();
      autoFitColumns(selectedCols.size ? Array.from(selectedCols) : [i], colgroup);
    });
    th.appendChild(resizer);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    columns.forEach((c, i) => {
      const td = document.createElement('td');
      td.textContent = r[c];
      td.style.color = columnColor(i);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  gridDiv.appendChild(table);

  columns.forEach((_, i) => autoFitColumns([i], colgroup));
}

function initResize(e, index, colgroup, th) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = th.getBoundingClientRect().width;
  colgroup.children[index].style.width = startWidth + 'px';

  function onMouseMove(ev) {
    const dx = ev.clientX - startX;
    const newWidth = Math.max(40, startWidth + dx);
    colgroup.children[index].style.width = newWidth + 'px';
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function calcAutoWidth(index) {
  const measure = document.createElement('span');
  measure.style.visibility = 'hidden';
  measure.style.position = 'absolute';
  measure.style.whiteSpace = 'pre';
  const style = getComputedStyle(gridDiv);
  measure.style.fontFamily = style.fontFamily;
  measure.style.fontSize = style.fontSize;
  document.body.appendChild(measure);
  let max = 0;
  measure.textContent = currentColumns[index];
  max = Math.max(max, measure.offsetWidth);
  currentRows.forEach(r => {
    measure.textContent = r[currentColumns[index]] ?? '';
    if (measure.offsetWidth > max) max = measure.offsetWidth;
  });
  measure.remove();
  return max + 16;
}

function autoFitColumns(indices, colgroup) {
  indices.forEach(i => {
    const w = calcAutoWidth(i);
    colgroup.children[i].style.width = w + 'px';
  });
}

function handleColumnClick(e, index, th, headerRow) {
  if (!(e.ctrlKey || e.metaKey)) {
    selectedCols.forEach(i => headerRow.children[i].classList.remove('selected'));
    selectedCols.clear();
  }
  if (selectedCols.has(index)) {
    selectedCols.delete(index);
    th.classList.remove('selected');
  } else {
    selectedCols.add(index);
    th.classList.add('selected');
  }
}
