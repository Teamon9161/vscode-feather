const vscode = acquireVsCodeApi();
let currentPage = 0;
const gridDiv = document.getElementById('grid');
const gridOptions = { columnDefs: [], rowData: [] };
const gridApi = (new agGrid.Grid(gridDiv, gridOptions)).api;

function request(page) {
  const pageSize = parseInt(document.getElementById('pageSize').value) || 100;
  const expr = document.getElementById('exprInput').value || 'df';
  vscode.postMessage({ type: 'load', page, pageSize, expr });
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
    gridApi.setColumnDefs(msg.columns.map(c => ({ headerName: c, field: c })));
    gridApi.setRowData(msg.rows);
    document.getElementById('status').textContent =
      'Showing ' + (msg.page * msg.pageSize + 1) + '-' + (msg.page * msg.pageSize + msg.rows.length) + ' of ' + msg.totalRows;
  } else if (msg.type === 'error') {
    document.getElementById('status').textContent = msg.error;
  }
});

request(0);
