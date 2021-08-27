import * as vscode from 'vscode';
import { GitExtension } from './vendor/git';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('automessage-codex.suggestCommitMessage', async () => {
		const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')!.exports;
		const git = gitExtension.getAPI(1);
		const diff = await git.repositories[0].diff(true);
		vscode.window.showInformationMessage(diff);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
