const vscode = acquireVsCodeApi();
let currentPage = 0;
const gridDiv = document.getElementById('grid');

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    const proxy = `
      self.MonacoEnvironment = { baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/' };
      importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/base/worker/workerMain.js');
    `;
    return URL.createObjectURL(new Blob([proxy], { type: 'text/javascript' }));
  }
};

let editor;
require(['vs/editor/editor.main'], function () {
  editor = monaco.editor.create(document.getElementById('editor'), {
    value: 'df',
    language: 'python',
    theme: document.body.classList.contains('vscode-dark') ? 'vs-dark' : 'vs',
    automaticLayout: true
  });
  request(0);
});

function getExpr() {
  return editor ? editor.getValue() : 'df';
}

const gridOptions = {
  columnDefs: [],
  rowData: [],
  defaultColDef: {
    sortable: true,
    filter: 'agTextColumnFilter',
    resizable: true,
    suppressMenuHide: true,
    menuTabs: ['filterMenuTab', 'generalMenuTab'],
    headerComponentParams: { menuIcon: 'filter' }
  },
  onSortChanged: params => updateExprAndRequest(params.api),
  onFilterChanged: params => updateExprAndRequest(params.api)
};
new agGrid.Grid(gridDiv, gridOptions);
const gridApi = gridOptions.api;

function request(page) {
  const pageSize = parseInt(document.getElementById('pageSize').value) || 100;
  const expr = getExpr();
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
  if (editor) {
    editor.setValue(expr);
  }
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
    gridApi.setColumnDefs(msg.columns.map(c => ({
      headerName: c,
      field: c
    })));
    gridApi.setRowData(msg.rows);
    document.getElementById('status').textContent =
      'Showing ' + (msg.page * msg.pageSize + 1) + '-' +
      (msg.page * msg.pageSize + msg.rows.length) + ' of ' + msg.totalRows;
  } else if (msg.type === 'error') {
    document.getElementById('status').textContent = msg.error;
  }
});
