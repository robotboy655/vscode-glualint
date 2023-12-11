'use strict';

import * as vscode from 'vscode';
import * as utils from './utils';
import LintProcess from './LintProcess';

// Copied from markdown language service
export enum DiagnosticCode {
	link_noSuchReferences = 'Trailing whitespace',
	link_noSuchHeaderInOwnFile = 'link.no-such-header-in-own-file',
	link_noSuchFile = 'link.no-such-file',
	link_noSuchHeaderInFile = 'link.no-such-header-in-file',
}

export default class GLuaLintFormatter implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    public activate(subscriptions: vscode.Disposable[]) {
        const config = vscode.workspace.getConfiguration('glualint');

        config.get<string[]>('activeLanguages').forEach(lang => {
            subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider({
                scheme: '*',
                language: lang,
            }, this));

            subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider({
                scheme: '*',
                language: lang,
            }, this));

            subscriptions.push(vscode.languages.registerCodeActionsProvider({
                scheme: '*',
                language: lang,
            }, this) );
        });
    }

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]>
    {
        const fixes: vscode.CodeAction[] = [];

		for (const diagnostic of context.diagnostics) {
            //console.log( "provideCodeActions '" + diagnostic.code + "'")

			switch (diagnostic.message) {
				case DiagnosticCode.link_noSuchReferences:
				case DiagnosticCode.link_noSuchHeaderInOwnFile:
				case DiagnosticCode.link_noSuchFile:
				case DiagnosticCode.link_noSuchHeaderInFile:
                {
                    const fix = new vscode.CodeAction( "Trim all trailing whitespace", vscode.CodeActionKind.QuickFix );

                    fix.command = {
                        command: "editor.action.trimTrailingWhitespace",
                        title: '',
                        arguments: [],
                    };
                    fixes.push( fix );
					break;
				}
			}
		}

		return fixes;
    }

    public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        const edits = this.formatDocument(document, options);
        return edits;
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        return this.formatDocument(document, options, range);
    }

    private formatDocument(doc: vscode.TextDocument, formatOptions: vscode.FormattingOptions, range?: vscode.Range): Promise<vscode.TextEdit[]> {
        if (range === undefined) {
            // Format entire document.
            range = utils.fullDocumentRange(doc);
        } else {
            // If range is empty or the selected text is nothing but whitespaces skip
            // formatting.
            if(range.isEmpty || doc.getText(range).trim() == '') {
                return;
            }
        }

        const indentation = formatOptions.insertSpaces ? ' '.repeat(formatOptions.tabSize) : '\t';
        const args = ['pretty-print', '--stdin', `--indentation=${indentation}`];
        const lintProcess: LintProcess = new LintProcess(doc.uri, args);

        if (!lintProcess.isValid()) {
            return Promise.resolve([]);
        }

        return new Promise<vscode.TextEdit[]>(resolve => {
            lintProcess.onExit((url, stdOut, code) => {
                // Check for empty StdOut because < glualint 1.17.2 does not set exit code
                if (code > 0 || stdOut === '') {
                    vscode.window.showErrorMessage('Failed to pretty print code, most likely due to syntax errors.');
                    resolve([]);
                    return;
                }

                resolve([vscode.TextEdit.replace(range, stdOut)]);
            });

            lintProcess.write(Buffer.from(doc.getText(range)));
        });
    }
}
