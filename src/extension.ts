import * as vscode from 'vscode'

interface Language {
	timeSpent: number,
	changesMade: number,
}
const serialize = (map: Map<string, Language>) => JSON.stringify(Array.from(map.entries()))
const deserialize = (serializedMap: string) => new Map<string, Language>(JSON.parse(serializedMap))
const minutes = (minutes: number) => minutes * 60 * 1000

export function activate(context: vscode.ExtensionContext) {
	// show welcome message (for testing purposes)
	vscode.window.showInformationMessage('Welcome to Code Levels!')

	// declare variables
	let currentLanguage: string
	let lastChange: number
	// get the saved languages from the global state, or create a new map if none exist
	let savedLanguages = context.globalState.get('languages')
	let languages: Map<string, Language> = savedLanguages
		? deserialize(savedLanguages as string)
		: new Map<string, Language>()
	if (!savedLanguages)
		context.globalState.update('languages', serialize(languages))

	// user modifies the current active file, get the language and update the changesMade counter for that language
	const changesMadeTracker = vscode.workspace.onDidChangeTextDocument((event) => {
		currentLanguage = event.document.languageId
		lastChange = Date.now()
		languages.get(currentLanguage)
			? languages.get(currentLanguage)!.changesMade++
			: languages.set(currentLanguage, { timeSpent: 0, changesMade: 1 })
	})
	context.subscriptions.push(changesMadeTracker)

	// every second, update the time spent in the current language, if the user is active (last change was less than 1 minute ago)
	const timeSpentTracker = setInterval(() => {
		if (Date.now() > lastChange + minutes(1))
			return
		if (currentLanguage === undefined)
			return
		languages.get(currentLanguage)!.timeSpent++
	}, 1000)

	// every 10 seconds, save the languages map to the global state
	const syncLanguages = setInterval(() => {
		context.globalState.update('languages', serialize(languages))
	}, 10000)

	// code levels reset command
	const resetStats = vscode.commands.registerCommand('code-levels.reset', () => {
		languages.clear()
		context.globalState.update('languages', serialize(languages))
	})
	context.subscriptions.push(resetStats)

	// show levels command
	const showLevels = vscode.commands.registerCommand('code-levels.showLevels', () => {
		// Create and show the WebView
		let levelsPanel = vscode.window.createWebviewPanel('userLevels', 'User Levels', vscode.ViewColumn.One, {})
		// Load the HTML content into the WebView
		levelsPanel.webview.html = getWebViewContent(serialize(languages))
	})
	context.subscriptions.push(showLevels)
}

function getWebViewContent(languages: string) {
	return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Extension Stats</title>
        </head>
        <body>
            <h1>Extension Stats</h1>
            <ul>
				${languages}
			</ul>
        </body>
        </html>
    `
}