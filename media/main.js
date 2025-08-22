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

const filterSvg =
  '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M3 4h18l-7 8v6l-4 2v-8z"/></svg>';

class CustomHeader {
  init(params) {
    this.params = params;
    this.eGui = document.createElement('div');
    this.eGui.classList.add('custom-header');
    this.eGui.innerHTML =
      '<span class="custom-header-label">' +
      params.displayName +
      '</span><button class="custom-header-button" type="button">' +
      filterSvg +
      '</button>';
    this.button = this.eGui.querySelector('button');
    this.clickListener = e => {
      e.stopPropagation();
      openFilterMenu(params, this.button);
    };
    this.button.addEventListener('click', this.clickListener);
  }
  getGui() {
    return this.eGui;
  }
  destroy() {
    if (this.button) {
      this.button.removeEventListener('click', this.clickListener);
    }
  }
}

let menuDiv;
function openFilterMenu(params, button) {
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
      params.columnApi.applyColumnState({
        state: [{ colId: params.column.getId(), sort: 'asc' }]
      });
      updateExprAndRequest(params.api);
      closeMenu();
    });
  menuDiv
    .querySelector('[data-action="desc"]')
    .addEventListener('click', () => {
      params.columnApi.applyColumnState({
        state: [{ colId: params.column.getId(), sort: 'desc' }]
      });
      updateExprAndRequest(params.api);
      closeMenu();
    });
  menuDiv
    .querySelector('[data-action="apply"]')
    .addEventListener('click', () => {
      const val = menuDiv.querySelector('.filter-input').value;
      const model = params.api.getFilterModel();
      if (val) {
        model[params.column.getId()] = { type: 'contains', filter: val };
      } else {
        delete model[params.column.getId()];
      }
      params.api.setFilterModel(model);
      updateExprAndRequest(params.api);
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

const gridOptions = {
  columnDefs: [],
  rowData: [],
  components: { customHeader: CustomHeader },
  defaultColDef: {
    sortable: true,
    filter: 'agTextColumnFilter',
    resizable: true,
    headerComponent: 'customHeader'
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
