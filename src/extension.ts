import * as vscode from 'vscode'
import axios from 'axios'
import { GitExtension } from './vendor/git'

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel(
    'Suggest commit message',
  )

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
      try {
        const apiKey = await getApiKey()
        if (!apiKey) {
          return
        }

        const gitExtension =
          vscode.extensions.getExtension<GitExtension>('vscode.git')!.exports
        const git = gitExtension.getAPI(1)
        const repository = git.repositories[0]
        let diff = await repository.diff(true)
        if (!diff.trim()) {
          diff = await repository.diff(false)
        }
        if (!diff.trim()) {
          vscode.window.showInformationMessage(
            'No changes to commit. Nothing to suggest',
          )
          return
        }

        const prefix = repository.inputBox.value
        const prompt = [
          '$ git add --all',
          '',
          '$ git diff --cached',
          diff,
          '',
          "$ git diff --cached -U0 | grep '^[+-]'",
          diff
            .split('\n')
            .filter((line) => line.startsWith('+') || line.startsWith('-'))
            .join('\n'),
          '',
          '$ git commit -m "' + prefix,
        ].join('\n')
        outputChannel.appendLine('# Prompt')
        outputChannel.appendLine(prompt)

        const quickPick = vscode.window.createQuickPick()
        quickPick.onDidAccept(() => {
          const selected = quickPick.selectedItems[0]
          repository.inputBox.value = selected.label
        })
        quickPick.show()

        const response = await axios.post(
          'https://api.openai.com/v1/engines/davinci-codex/completions',
          {
            prompt,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            max_tokens: 32,
            n: 10,
            stop: ['\n'],
            temperature: 0.5,
            // logprobs: 2,
          },
          {
            headers: {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              Authorization: 'Bearer ' + apiKey,
            },
          },
        )
        outputChannel.appendLine('# Response')
        outputChannel.appendLine(JSON.stringify(response.data, null, 2))
        quickPick.items = createQuickPickItems(prefix, response.data.choices)
      } catch (error: any) {
        vscode.window.showErrorMessage(
          'Unable to suggest commit message: ' + error.message,
        )
        outputChannel.appendLine('# Error')
        outputChannel.appendLine(error.stack)
      }
    },
  )

  function createQuickPickItems(
    prefix: string,
    choices: { text: string }[],
  ): vscode.QuickPickItem[] {
    return choices.map((choice) => ({
      label: prefix + choice.text,
    }))
  }

  context.subscriptions.push(disposable)
}

export function deactivate() {}
