// Opens the cat in a side panel and waits for the user to click something.
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// `data` is handed to media/cat.html, which decides what the cat says and does.
// Resolves to what the page sends back, e.g. { choice: 'done', seconds: 72 } or { choice: 'snooze' },
// or {} if the tab is closed.
function showCatPanel(extensionPath, data) {
  return new Promise((resolve) => {
    const mediaPath = path.join(extensionPath, 'media');
    const panel = vscode.window.createWebviewPanel(
      'mochiCat',
      `${data.catName} 🐱`,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, // don't steal your cursor
      { enableScripts: true, localResourceRoots: [vscode.Uri.file(mediaPath)] }
    );

    const values = {
      nonce: crypto.randomBytes(16).toString('hex'),
      cspSource: panel.webview.cspSource,
      fontUri: panel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, 'fonts', 'Fredoka.ttf'))).toString(),
      data: JSON.stringify(data).replace(/</g, '\\u003c'), // safe to put inside <script>
      catCss: fs.readFileSync(path.join(mediaPath, 'cat-art.css'), 'utf8'),
      catSvg: fs.readFileSync(path.join(mediaPath, 'cat-art.svg'), 'utf8'),
    };
    const template = fs.readFileSync(path.join(mediaPath, 'cat.html'), 'utf8');
    panel.webview.html = template.replace(/{{(\w+)}}/g, (match, key) => (key in values ? values[key] : match));

    let answered = false;
    panel.webview.onDidReceiveMessage((msg) => {
      answered = true;
      resolve(msg);
      panel.dispose();
    });
    panel.onDidDispose(() => {
      if (!answered) resolve({});
    });
  });
}

module.exports = { showCatPanel };
