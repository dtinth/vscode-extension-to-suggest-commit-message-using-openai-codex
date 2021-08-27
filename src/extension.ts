import * as vscode from 'vscode'
import { GitExtension } from './vendor/git'

export function activate(context: vscode.ExtensionContext) {
  async function getApiKey(): Promise<string | undefined> {
    let apiKey = context.globalState.get<string>('apiKey')
    if (!apiKey) {
      apiKey = await setApiKey()
    }
    return apiKey
  }

  async function setApiKey() {
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your OpenAI API key',
    })
    if (!apiKey) {
      vscode.window.showErrorMessage('OpenAI API key is required')
      return undefined
    }
    const apiKeyRegExp = /^sk-\S+$/
    if (!apiKeyRegExp.test(apiKey)) {
      vscode.window.showErrorMessage('Invalid OpenAI API key')
      return undefined
    }
    await context.globalState.update('apiKey', apiKey)
    return apiKey
  }

  let disposable = vscode.commands.registerCommand(
    'automessage-codex.suggestCommitMessage',
    async () => {
      const apiKey = await getApiKey()
      if (!apiKey) {
        return
      }
      const gitExtension =
        vscode.extensions.getExtension<GitExtension>('vscode.git')!.exports
      const git = gitExtension.getAPI(1)
      const repository = git.repositories[0]
      const diff = await repository.diff(true)
      vscode.window.showInformationMessage(diff)
    },
  )

  context.subscriptions.push(disposable)
}

export function deactivate() {}
