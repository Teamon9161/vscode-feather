const vscode = acquireVsCodeApi();
let currentPage = 0;
const gridDiv = document.getElementById('grid');
const exprInput = document.getElementById('exprInput');

exprInput.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = exprInput.selectionStart;
    const end = exprInput.selectionEnd;
    exprInput.value = exprInput.value.substring(0, start) + '  ' + exprInput.value.substring(end);
    exprInput.selectionStart = exprInput.selectionEnd = start + 2;
  }
});

class CustomHeader {
  init(params) {
    this.params = params;
    this.eGui = document.createElement('div');
    this.eGui.classList.add('custom-header');
    this.eGui.innerHTML =
      `<span class="custom-header-label">${params.displayName}</span>` +
      `<span class="header-buttons">` +
      `<button class="sort-asc">▲</button>` +
      `<button class="sort-desc">▼</button>` +
      `<button class="filter-btn">🔍</button>` +
      `</span>`;
    this.eGui.querySelector('.sort-asc').addEventListener('click', () => {
      params.api.setSortModel([{ colId: params.column.getId(), sort: 'asc' }]);
    });
    this.eGui.querySelector('.sort-desc').addEventListener('click', () => {
      params.api.setSortModel([{ colId: params.column.getId(), sort: 'desc' }]);
    });
    this.eGui.querySelector('.filter-btn').addEventListener('click', () => {
      const val = prompt('Filter ' + params.displayName);
      if (val !== null) {
        const instance = params.api.getFilterInstance(params.column.getId());
        if (instance) {
          instance.setModel({ type: 'contains', filter: val });
          params.api.onFilterChanged();
        }
      }
    });
    this.eGui.addEventListener('dblclick', () => {
      params.api.autoSizeColumns([params.column.getId()]);
    });
  }
  getGui() { return this.eGui; }
  refresh() { return true; }
}

const gridOptions = {
  columnDefs: [],
  rowData: [],
  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    headerComponent: CustomHeader,
    suppressMenu: true
  },
  onSortChanged: params => updateExprAndRequest(params.api),
  onFilterChanged: params => updateExprAndRequest(params.api)
};
const gridApi = (new agGrid.Grid(gridDiv, gridOptions)).api;

function request(page) {
  const pageSize = parseInt(document.getElementById('pageSize').value) || 100;
  const expr = exprInput.value || 'df';
  vscode.postMessage({ type: 'load', page, pageSize, expr });
}

function buildExpression(api) {
  let expr = 'df';
  const sortState = api.getColumnState().find(c => c.sort);
  if (sortState) {
    expr += `.sort("${sortState.colId}"${sortState.sort === 'desc' ? ', descending=true' : ''})`;
  }
  const filterModel = api.getFilterModel();
  const filters = [];
  for (const [col, model] of Object.entries(filterModel)) {
    if (model.filter != null && model.filter !== '') {
      if (model.type === 'contains') {
        filters.push(`pl.col("${col}").str.contains("${model.filter}")`);
      } else {
        filters.push(`pl.col("${col}") == "${model.filter}"`);
      }
    }
  }
  if (filters.length) {
    expr += `.filter(${filters.join(' & ')})`;
  }
  return expr;
}

function updateExprAndRequest(api) {
  const expr = buildExpression(api);
  exprInput.value = expr;
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
    gridApi.setColumnDefs(msg.columns.map((c, i) => ({
      headerName: c,
      field: c,
      headerClass: `col-${i}`,
      cellClass: `col-${i}`
    })));
    gridApi.setRowData(msg.rows);
    document.getElementById('status').textContent =
      'Showing ' + (msg.page * msg.pageSize + 1) + '-' + (msg.page * msg.pageSize + msg.rows.length) + ' of ' + msg.totalRows;
  } else if (msg.type === 'error') {
    document.getElementById('status').textContent = msg.error;
  }
});

request(0);
