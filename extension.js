const vscode = require('vscode');
const path = require('path');
const child_process = require('child_process');

class FeatherViewerProvider {
  constructor(context) {
    this.context = context;
  }

  openCustomDocument(uri) {
    return { uri, dispose() {} };
  }

  async resolveCustomEditor(document, webviewPanel) {
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = getWebviewContent();

    webviewPanel.webview.onDidReceiveMessage(async message => {
      if (message.type === 'load') {
        const result = await runPython(this.context, document.uri.fsPath, message.page, message.pageSize, message.filter);
        if (result.error) {
          webviewPanel.webview.postMessage({ type: 'error', error: result.error });
        } else {
          webviewPanel.webview.postMessage({
            type: 'data',
            columns: result.columns,
            rows: result.rows,
            totalRows: result.totalRows,
            page: message.page,
            pageSize: message.pageSize
          });
        }
      }
    });
  }
}

function activate(context) {
  const provider = new FeatherViewerProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider('feather.viewer', provider, { supportsMultipleEditorsPerDocument: false })
  );

  const openCommand = vscode.commands.registerCommand('feather.openFeather', async (uri) => {
    if (!uri) {
      const fileUris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'Feather Files': ['feather'] }
      });
      if (!fileUris || fileUris.length === 0) {
        return;
      }
      uri = fileUris[0];
    }
    await vscode.commands.executeCommand('vscode.openWith', uri, 'feather.viewer');
  });

  context.subscriptions.push(openCommand);
}

exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;

function runPython(context, file, page, pageSize, filter) {
  return new Promise(resolve => {
    const config = vscode.workspace.getConfiguration('feather');
    const pythonPath = config.get('pythonPath', 'python');
    const script = context.asAbsolutePath(path.join('python', 'viewer.py'));
    const args = [script, file, '--page', String(page), '--page_size', String(pageSize)];
    if (filter) {
      args.push('--filter', filter);
    }
    const py = child_process.spawn(pythonPath, args);
    let out = '';
    let err = '';
    py.stdout.on('data', d => out += d);
    py.stderr.on('data', d => err += d);
    py.on('close', () => {
      try {
        resolve(JSON.parse(out));
      } catch (e) {
        resolve({ error: err || e.message });
      }
    });
  });
}

function getWebviewContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src https://unpkg.com; style-src https://unpkg.com 'unsafe-inline';" />
  <script src="https://unpkg.com/ag-grid-community/dist/ag-grid-community.min.noStyle.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/ag-grid-community/dist/styles/ag-grid.css" />
  <link rel="stylesheet" href="https://unpkg.com/ag-grid-community/dist/styles/ag-theme-alpine.css" />
  <link rel="stylesheet" href="https://unpkg.com/ag-grid-community/dist/styles/ag-theme-alpine-dark.css" />
  <style>
    body {
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
    }
    .controls {
      margin-bottom: 8px;
    }
    button, input {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: 1px solid var(--vscode-button-border, transparent);
      padding: 2px 6px;
    }
    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
    input {
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
    }
    #grid {
      height: 70vh;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="controls">
    <label>Page Size: <input id="pageSize" value="100" /></label>
    <label>Page: <input id="pageNumber" value="1" /></label>
    <button id="gotoBtn">Go</button>
    <button id="prevBtn">Prev</button>
    <button id="nextBtn">Next</button>
    <input id="filterInput" placeholder='Filter (e.g., col("column") == 1)' />
    <button id="filterBtn">Apply Filter</button>
  </div>
  <div id="status"></div>
  <div id="grid" class="ag-theme-alpine"></div>
  <script>
    const vscode = acquireVsCodeApi();
    let currentPage = 0;
    const gridDiv = document.getElementById('grid');
    const themeClass = document.body.classList.contains('vscode-dark') ? 'ag-theme-alpine-dark' : 'ag-theme-alpine';
    gridDiv.classList.add(themeClass);
    const gridOptions = {
      columnDefs: [],
      rowData: [],
      defaultColDef: { resizable: true, sortable: true, filter: true }
    };
    new agGrid.Grid(gridDiv, gridOptions);
    function request(page){
      const pageSize = parseInt(document.getElementById('pageSize').value) || 100;
      const filter = document.getElementById('filterInput').value;
      vscode.postMessage({ type: 'load', page, pageSize, filter });
    }
    document.getElementById('nextBtn').addEventListener('click', () => request(currentPage + 1));
    document.getElementById('prevBtn').addEventListener('click', () => request(Math.max(0, currentPage - 1)));
    document.getElementById('gotoBtn').addEventListener('click', () => {
      const p = parseInt(document.getElementById('pageNumber').value) - 1;
      request(p);
    });
    document.getElementById('filterBtn').addEventListener('click', () => request(0));

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'data') {
        currentPage = msg.page;
        document.getElementById('pageNumber').value = msg.page + 1;
        gridOptions.api.setColumnDefs(msg.columns.map(c => ({ headerName: c, field: c })));
        gridOptions.api.setRowData(msg.rows);
        document.getElementById('status').textContent =
          'Showing ' + (msg.page * msg.pageSize + 1) + '-' + (msg.page * msg.pageSize + msg.rows.length) + ' of ' + msg.totalRows;
      } else if (msg.type === 'error') {
        document.getElementById('status').textContent = msg.error;
      }
    });

    request(0);
  </script>
</body>
</html>`;
}
