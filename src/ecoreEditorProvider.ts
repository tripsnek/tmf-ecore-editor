import * as vscode from 'vscode';
import * as path from 'path';
import { EPackage, EcoreParser} from '@tripsnek/tmf';

export class EcoreEditorProvider implements vscode.CustomTextEditorProvider {
    private static readonly viewType = 'tmf-ecore-editor.ecoreEditor';
    
    constructor(private readonly context: vscode.ExtensionContext) {}

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Configure webview options
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                vscode.Uri.joinPath(this.context.extensionUri, 'dist')
            ]
        };

        // Track if we're updating from webview to prevent loops
        let updatingFromWebview = false;

        // Parse the ecore document
        let rootPackage: EPackage | null = null;
        let xmlAsJson = '';
        try {
            const parser = new EcoreParser();
            rootPackage = parser.parseFromXmlString(document.getText());
            xmlAsJson = JSON.stringify(parser.xmlToJs(document.getText()));
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to parse Ecore file: ${error}`);
        }
        console.log('JSON ecore size: ' + xmlAsJson.length + ' and root package is ' + rootPackage?.getName());

        // Set up the webview content
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);

        // Handle messages from the webview
        console.log('Setting up message handling');
        webviewPanel.webview.onDidReceiveMessage(
            async (message) => {
                console.log('onDidReceiveMessage ' + message.command);
                switch (message.command) {
                    case 'ready':
                        console.log('preparing to send xmlAsJson to webview');
                        // Send initial model data to webview
                        if (rootPackage) {
                            webviewPanel.webview.postMessage({
                                type: 'loadModel',
                                content: xmlAsJson,
                                fileName: path.basename(document.fileName)
                            });
                        }
                        break;
                    
                    case 'updateDocument':
                        // Update the document with new model content (XML)
                        // This is the immediate update when properties change
                        console.log('Updating document with XML content');
                        updatingFromWebview = true;
                        await this.updateTextDocument(document, message.content);
                        updatingFromWebview = false;
                        break;
                    
                    case 'showMessage':
                        vscode.window.showInformationMessage(message.text);
                        break;
                    
                    case 'showError':
                        vscode.window.showErrorMessage(message.text);
                        break;
                    
                    case 'getModel':
                        // Re-parse and send current model
                        try {
                            const parser = new EcoreParser();
                            const xmlAsJsonNew = JSON.stringify(parser.xmlToJs(document.getText()));
                            webviewPanel.webview.postMessage({
                                type: 'modelData',
                                content: xmlAsJsonNew
                            });
                        } catch (error) {
                            webviewPanel.webview.postMessage({
                                type: 'error',
                                message: `Failed to parse model: ${error}`
                            });
                        }
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        // Listen for document changes from outside the webview
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                // Only update if change came from outside our editor
                // and we're not currently updating from the webview
                if (!updatingFromWebview && e.contentChanges.length > 0) {
                    // Parse the XML and convert to JSON before sending
                    try {
                        const parser = new EcoreParser();
                        const xmlAsJsonUpdated = JSON.stringify(parser.xmlToJs(document.getText()));
                        webviewPanel.webview.postMessage({
                            type: 'externalUpdate',
                            content: xmlAsJsonUpdated // Send JSON, not XML
                        });
                    } catch (error) {
                        console.error('Failed to parse updated document:', error);
                    }
                }
            }
        });

        // Clean up
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    }

    private async updateTextDocument(document: vscode.TextDocument, content: string) {
        const edit = new vscode.WorkspaceEdit();
        
        // Replace entire document
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            content
        );
        
        return vscode.workspace.applyEdit(edit);
    }

    private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
        // Get resource URIs
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'editor.css')
        );
        const codiconsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'codicon.css')
        );

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${codiconsUri}" rel="stylesheet" />
                <link href="${styleUri}" rel="stylesheet">
                <title>Ecore Editor</title>
            </head>
            <body>
                <div id="app">
                    <div class="loading">
                        <i class="codicon codicon-loading codicon-modifier-spin"></i>
                        <p>Loading Ecore Editor...</p>
                    </div>
                </div>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    window.vscode = vscode;
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}