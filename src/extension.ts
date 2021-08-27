import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('automessage-codex.suggestCommitMessage', () => {
		vscode.window.showInformationMessage('Hello World from automessage-codex!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
