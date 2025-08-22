const vscode = acquireVsCodeApi();
let currentPage = 0;
const gridDiv = document.getElementById('grid');
const gridOptions = {
  columnDefs: [],
  rowData: [],
  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true
  },
  onSortChanged: params => updateExprAndRequest(params.api),
  onFilterChanged: params => updateExprAndRequest(params.api),
  onColumnHeaderDoubleClicked: params => {
    params.api.autoSizeColumns([params.column.getId()]);
  }
};
const gridApi = (new agGrid.Grid(gridDiv, gridOptions)).api;

function request(page) {
  const pageSize = parseInt(document.getElementById('pageSize').value) || 100;
  const expr = document.getElementById('exprInput').value || 'df';
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
  document.getElementById('exprInput').value = expr;
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
    const colors = ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)', 'rgba(255, 206, 86, 0.2)',
      'rgba(75, 192, 192, 0.2)', 'rgba(153, 102, 255, 0.2)', 'rgba(255, 159, 64, 0.2)'];
    gridApi.setColumnDefs(msg.columns.map((c, i) => ({
      headerName: c,
      field: c,
      cellStyle: { backgroundColor: colors[i % colors.length] }
    })));
    gridApi.setRowData(msg.rows);
    document.getElementById('status').textContent =
      'Showing ' + (msg.page * msg.pageSize + 1) + '-' + (msg.page * msg.pageSize + msg.rows.length) + ' of ' + msg.totalRows;
  } else if (msg.type === 'error') {
    document.getElementById('status').textContent = msg.error;
  }
});

request(0);
