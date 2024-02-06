'use strict';

import * as vscode from 'vscode';
import GLuaLintingProvider from './glualintProvider';
import GLuaLintFormatter from './glualintFormatter';
import GLuaLintFixer from './glualintFixer';

export function activate(context: vscode.ExtensionContext) {
    const linter = new GLuaLintingProvider();
    linter.activate(context.subscriptions);

    const formatter = new GLuaLintFormatter();
    formatter.activate(context.subscriptions);

    const fixer = new GLuaLintFixer();
    fixer.activate(context.subscriptions);
}
