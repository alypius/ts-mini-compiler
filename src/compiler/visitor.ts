import { Nodes } from "./parser";
import { ILexeme, Token, Tokens } from "./lexer";
import { IOption, none, some } from "utils/option";

export namespace Processed {
    export type StatementListItems<T> = {
        body: T[]
    };

    export type ExpressionStatement<T> = {
        expression: T
    };

    export type ReturnStatement<T> = {
        argument: IOption<T>
    };

    export type VariableStatement<T> = {
        init: IOption<T>;
    };

    export type FunctionDeclaration<T> = {
        params: T[];
        body: T;
    };

    export type CallExpression<T> = {
        callArguments: T[];
    };

    export type UnaryExpression<T> = {
        argument: T;
    };

    export type BinaryExpression<T> = {
        left: T;
        right: T;
    };

    export type ConditionalExpression<T> = {
        test: T;
        consequent: T;
        alternate: T;
    };
}

export abstract class BaseVisitor<T> {
    public visitProgram(program: Nodes.Program): T {
        return this.processStatementListItems({ body: program.body.map(item => this.visitStatementListItem(item)) });
    }

    protected abstract processStatementListItems(processed: Processed.StatementListItems<T>): T;
    protected abstract processExpressionStatement(node: Nodes.ExpressionStatement, processed: Processed.ExpressionStatement<T>): T;
    protected abstract processReturnStatement(node: Nodes.ReturnStatement, processed: Processed.ReturnStatement<T>): T;
    protected abstract processVariableStatement(node: Nodes.VariableStatement, processed: Processed.VariableStatement<T>): T;
    protected abstract processFunctionDeclaration(node: Nodes.FunctionDeclaration, processed: Processed.FunctionDeclaration<T>): T;
    protected abstract processFunctionParameter(node: Nodes.FunctionParameter): T;
    protected abstract processCallExpression(node: Nodes.CallExpression, processed: Processed.CallExpression<T>): T;
    protected abstract processUnaryExpression(node: Nodes.UnaryExpression, processed: Processed.UnaryExpression<T>): T;
    protected abstract processBinaryExpression<TToken extends Token>(node: Nodes.BinaryExpression<TToken>, processed: Processed.BinaryExpression<T>): T;
    protected abstract processConditionalExpression(node: Nodes.ConditionalExpression, processed: Processed.ConditionalExpression<T>): T;
    protected abstract processIdentifierExpression(lexeme: ILexeme<Tokens.Identifier>): T;
    protected abstract processLiteralExpression(lexeme: ILexeme<Tokens.Literal>): T;

    protected visitStatementListItem(statementListItem: Nodes.StatementListItem): T {
        return Nodes.patternMatchStatementListItem({
            functionDeclaration: statementListItem => this.visitFunctionDeclaration(statementListItem),
            statement: statementListItem => this.visitStatement(statementListItem)
        }, statementListItem);
    }

    protected visitFunctionDeclaration(functionDeclaration: Nodes.FunctionDeclaration): T {
        const params = functionDeclaration.params.map(param => this.processFunctionParameter(param));
        const body = this.processStatementListItems({ body: functionDeclaration.body.map(item => this.visitStatementListItem(item)) });
        return this.processFunctionDeclaration(functionDeclaration, { params, body });
    }

    protected visitStatement(statement: Nodes.Statement): T {
        return Nodes.patternMatchStatement({
            expressionStatement: statement => this.processExpressionStatement(statement, {
                expression: this.visitExpression(statement.expression)
            }),
            returnStatement: statement => this.processReturnStatement(statement, {
                argument: statement.argument.match<IOption<T>>({
                    some: expression => some(this.visitExpression(expression)),
                    none: () => none()
                })
            }),
            variableStatement: statement => this.processVariableStatement(statement, {
                init: statement.init.match<IOption<T>>({
                    some: expression => some(this.visitExpression(expression)),
                    none: () => none()
                })
            })
        }, statement);
    }

    protected visitExpression(expression: Nodes.Expression): T {
        return Nodes.patternMatchExpression({
            baseExpression: expression => Nodes.patternMatchBaseExpression<T>({
                callExpression: expression => this.processCallExpression(expression, {
                    callArguments: expression.callArguments.map(callArgument => this.visitExpression(callArgument))
                }),
                unaryExpression: expression => this.processUnaryExpression(expression, {
                    argument: this.visitExpression(expression.argument)
                }),
                binaryExpression: expression => this.processBinaryExpression(expression, {
                    left: this.visitExpression(expression.left),
                    right: this.visitExpression(expression.right)
                }),
                conditionalExpression: expression => this.processConditionalExpression(expression, {
                    test: this.visitExpression(expression.test),
                    consequent: this.visitExpression(expression.consequent),
                    alternate: this.visitExpression(expression.alternate)
                })
            }, expression),
            identifier: expression => this.processIdentifierExpression(expression),
            literal: expression => this.processLiteralExpression(expression)
        }, expression);
    }
}
