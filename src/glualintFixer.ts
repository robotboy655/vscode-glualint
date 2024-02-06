
import * as vscode from 'vscode';

export default class GLuaLintFixer implements vscode.CodeActionProvider {
    public activate(subscriptions: vscode.Disposable[]) {
        const config = vscode.workspace.getConfiguration('glualint');

        config.get<string[]>('activeLanguages').forEach(lang => {
            subscriptions.push(vscode.languages.registerCodeActionsProvider({
                scheme: '*',
                language: lang,
            }, this));
        });
    }

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        const fixes: vscode.CodeAction[] = [];

		for (const diagnostic of context.diagnostics) {
			if ( diagnostic.message == 'Trailing whitespace' ) {
                const fix = new vscode.CodeAction('Trim all trailing whitespace', vscode.CodeActionKind.QuickFix);
                fix.command = {
                    command: 'editor.action.trimTrailingWhitespace',
                    title: '',
                    arguments: []
                };
                fixes.push( fix );
            }
			
            const inconsist = diagnostic.message.match(/Inconsistent use of '(.+)' and '(.+)'/);
            if (inconsist) {
                let inc1 = inconsist[1];
                let inc2 = inconsist[2];
                let srcRange = diagnostic.range;
                if (document.getText(srcRange) != inc1) { inc1 = inconsist[2]; inc2 = inconsist[1]; }

                let testRangeA = new vscode.Range(srcRange.end.line, srcRange.end.character, srcRange.end.line, srcRange.end.character + 1);
                let testRangeB = new vscode.Range(srcRange.start.line, srcRange.start.character - 1, srcRange.start.line, srcRange.start.character);
                if (document.getText(testRangeA) != ' ') inc2 += ' ';
                if (document.getText(testRangeB) != ' ') inc2 = ' ' + inc2;
                if (inc1 == 'not' && document.getText(testRangeA) == ' ') srcRange = new vscode.Range(srcRange.start.line, srcRange.start.character, srcRange.end.line, srcRange.end.character + 1);

                const fix = new vscode.CodeAction(`Replace '${inc1}' with '${inc2}'`, vscode.CodeActionKind.QuickFix);
                fix.edit = new vscode.WorkspaceEdit();
                fix.edit.replace(document.uri, srcRange, inc2);
                fixes.push( fix );
			}
		}

		return fixes;
    }
}
