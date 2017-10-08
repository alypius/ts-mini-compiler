import { Nodes } from "./parser";
import { ILexeme, Token, Tokens, isLexeme } from "./lexer";
import { IOption, none, some } from "utils/option";

export namespace ProcessingArguments {
    export type StatementListItems<T> = { body: T[] };

    export type ExpressionStatement<T> = { expression: T };

    export type ReturnStatement<T> = { argument: IOption<T> };

    export type VariableStatement<T> = {
        kind: ILexeme<Tokens.VariableKind>;
        id: ILexeme<Tokens.Identifier>;
        typeAnnotation: IOption<Nodes.TypeAnnotation>;
        init: IOption<T>;
    };

    export type FunctionDeclaration<T> = {
        id: ILexeme<Tokens.Identifier>;
        params: T[];
        returnTypeAnnotation: IOption<Nodes.TypeAnnotation>;
        body: T;
    };

    export type FunctionParameter = Nodes.FunctionParameter;

    export type CallExpression<T> = {
        callee: ILexeme<Tokens.Identifier>;
        callArguments: T[];
    };

    export type UnaryExpression<T> = {
        operator: ILexeme<Tokens.UnaryOperator>;
        argument: T;
    };

    export type BinaryExpression<T> = {
        operator: ILexeme<Token>;
        left: T;
        right: T;
    };

    export type ConditionalExpression<T> = {
        test: T;
        consequent: T;
        alternate: T;
    };

    export type LexemeExpression = {
        lexeme: ILexeme<Token>;
    };
}

export abstract class BaseVisitor<T> {
    public visitProgram(program: Nodes.Program): T {
        return this.processStatementListItems({ body: program.body.map(item => this.visitStatementListItem(item)) });
    }

    protected abstract processStatementListItems(args: ProcessingArguments.StatementListItems<T>): T;
    protected abstract processExpressionStatement(args: ProcessingArguments.ExpressionStatement<T>): T;
    protected abstract processReturnStatement(args: ProcessingArguments.ReturnStatement<T>): T;
    protected abstract processVariableStatement(args: ProcessingArguments.VariableStatement<T>): T;
    protected abstract processFunctionDeclaration(args: ProcessingArguments.FunctionDeclaration<T>): T;
    protected abstract processFunctionParameter(args: ProcessingArguments.FunctionParameter): T;
    protected abstract processCallExpression(args: ProcessingArguments.CallExpression<T>): T;
    protected abstract processUnaryExpression(args: ProcessingArguments.UnaryExpression<T>): T;
    protected abstract processBinaryExpression(args: ProcessingArguments.BinaryExpression<T>): T;
    protected abstract processConditionalExpression(args: ProcessingArguments.ConditionalExpression<T>): T;
    protected abstract processLexemeExpression(lexeme: ProcessingArguments.LexemeExpression): T;

    private visitStatementListItem(statementListItem: Nodes.StatementListItem): T {
        if (statementListItem instanceof Nodes.FunctionDeclaration)
            return this.visitFunctionDeclaration(statementListItem);
        else
            return this.visitStatement(statementListItem);
    }

    private visitFunctionDeclaration(functionDeclaration: Nodes.FunctionDeclaration): T {
        const params = functionDeclaration.params.map(param => this.processFunctionParameter(param));
        const body = this.processStatementListItems({ body: functionDeclaration.body.map(item => this.visitStatementListItem(item)) });
        return this.processFunctionDeclaration({
            id: functionDeclaration.id,
            returnTypeAnnotation: functionDeclaration.returnTypeAnnotation,
            params: params,
            body: body
        });
    }

    private visitStatement(statement: Nodes.Statement): T {
        if (statement instanceof Nodes.ExpressionStatement)
            return this.processExpressionStatement({ expression: this.visitExpression(statement.expression) });
        else if (statement instanceof Nodes.ReturnStatement)
            return this.processReturnStatement({
                argument: statement.argument.match<IOption<T>>({
                    some: expression => some(this.visitExpression(expression)),
                    none: () => none()
                })
            });
        else if (statement instanceof Nodes.VariableStatement) {
            return this.processVariableStatement({
                kind: statement.kind,
                id: statement.id,
                typeAnnotation: statement.typeAnnotation,
                init: statement.init.match<IOption<T>>({
                    some: expression => some(this.visitExpression(expression)),
                    none: () => none()
                })
            });
        } else
            throw new Error("Unknown statement type");
    }

    private visitExpression(expression: Nodes.Expression): T {
        if (expression instanceof Nodes.CallExpression)
            return this.processCallExpression({
                callee: expression.callee,
                callArguments: expression.callArguments.map(callArgument => this.visitExpression(callArgument))
            });
        else if (expression instanceof Nodes.UnaryExpression)
            return this.processUnaryExpression({
                operator: expression.operator,
                argument: this.visitExpression(expression.argument)
            });
        else if (expression instanceof Nodes.BinaryExpression)
            return this.processBinaryExpression({
                operator: expression.operator,
                left: this.visitExpression(expression.left),
                right: this.visitExpression(expression.right)
            });
        else if (expression instanceof Nodes.ConditionalExpression)
            return this.processConditionalExpression({
                test: this.visitExpression(expression.test),
                consequent: this.visitExpression(expression.consequent),
                alternate: this.visitExpression(expression.alternate)
            });
        else if (isLexeme(expression))
            return this.processLexemeExpression({ lexeme: expression });
        else
            throw new Error("Unknown expression type");
    }
}
