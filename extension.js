const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');

class FeatherViewerProvider {
  constructor(context) {
    this.context = context;
  }

  openCustomDocument(uri) {
    return { uri, dispose() { } };
  }

  async resolveCustomEditor(document, webviewPanel) {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
    };
    webviewPanel.webview.html = getWebviewContent(this.context, webviewPanel.webview);

    webviewPanel.webview.onDidReceiveMessage(async message => {
      if (message.type === 'load') {
        const result = await runPython(this.context, document.uri.fsPath, message.page, message.pageSize, message.expr);
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

function deactivate() { }
exports.deactivate = deactivate;

function runPython(context, file, page, pageSize, expr) {
  return new Promise(resolve => {
    const config = vscode.workspace.getConfiguration('feather');
    const pythonPath = config.get('pythonPath', 'python');
    const script = context.asAbsolutePath(path.join('python', 'viewer.py'));
    const args = [script, file, '--page', String(page), '--page_size', String(pageSize), '--expr', expr || 'df'];
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

function getWebviewContent(context, webview) {
  const htmlPath = path.join(context.extensionPath, 'media', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  const agGridUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'ag-grid-community.min.js')
  );
  const mainUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'main.js')
  );
  const csp = `default-src 'none'; img-src ${webview.cspSource} https:; script-src ${webview.cspSource} https: 'unsafe-inline'; style-src ${webview.cspSource} https: 'unsafe-inline'; font-src ${webview.cspSource} https:; worker-src blob:;`;
  html = html.replace('{{agGridUri}}', agGridUri.toString());
  html = html.replace('{{mainUri}}', mainUri.toString());
  html = html.replace('{{csp}}', csp);
  return html;
}