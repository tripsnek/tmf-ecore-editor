import * as vscode from 'vscode';
import { EcoreEditorProvider } from './ecoreEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('TMF Ecore Editor extension is now active!');

    // Register the custom editor provider
    const provider = new EcoreEditorProvider(context);
    
    const providerRegistration = vscode.window.registerCustomEditorProvider(
        'tmf-ecore-editor.ecoreEditor',
        provider,
        {
            webviewOptions: {
                retainContextWhenHidden: true,
                // enableScripts: true
            },
            supportsMultipleEditorsPerDocument: false
        }
    );

    // Register the open editor command
    const openEditorCommand = vscode.commands.registerCommand(
        'tmf-ecore-editor.openEditor',
        async () => {
            // Create a new untitled ecore file
            const doc = await vscode.workspace.openTextDocument({
                language: 'xml',
                content: getDefaultEcoreContent()
            });
            
            await vscode.window.showTextDocument(doc);
            
            // Then open with our custom editor
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    );

    // Register a command to create a new Ecore model
    const newEcoreCommand = vscode.commands.registerCommand(
        'tmf-ecore-editor.newModel',
        async () => {
            const fileName = await vscode.window.showInputBox({
                prompt: 'Enter the name for the new Ecore model',
                value: 'model.ecore',
                validateInput: (value) => {
                    if (!value.endsWith('.ecore')) {
                        return 'File name must end with .ecore';
                    }
                    return null;
                }
            });

            if (!fileName) {
                return;
            }

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, fileName);
            const content = getDefaultEcoreContent();
            
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);
        }
    );

    context.subscriptions.push(
        providerRegistration,
        openEditorCommand,
        newEcoreCommand
    );

    // Show information message on activation
    // vscode.window.showInformationMessage('TMF Ecore Editor is ready! Open any .ecore file to start editing.');
}

export function deactivate() {
    console.log('TMF Ecore Editor extension is now deactivated.');
}

function getDefaultEcoreContent(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" 
    xmlns:xmi="http://www.omg.org/XMI" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" 
    name="mypackage" 
    nsURI="http://www.example.org/mypackage" 
    nsPrefix="mypackage">
  
  <eClassifiers xsi:type="ecore:EClass" name="MyClass">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="name" eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="value" eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EInt"/>
  </eClassifiers>
  
</ecore:EPackage>`;
}