import { Nodes } from "./parser";
import { ILexeme, IPosition, Token, Tokens, positionFromLexeme } from "./lexer";
import { BaseVisitor, Processed } from "./visitor";
import { Scope, ISymbol, IHasSymbolTable, symbolNameFromLexeme } from "./symbol_table";
import { flatten } from "utils/list";
import { identity, thunk, hasValue } from "utils/value";
import { IOption, some, none } from "utils/option";

export interface ISemanticError {
    message: string;
    position: IPosition;
}

function isSemanticError(val: any): val is ISemanticError {
    return hasValue(val) && hasValue((val as ISemanticError).message) && hasValue((val as ISemanticError).position);
}

function createSemanticError(message: string, lexeme: ILexeme<Token>): ISemanticError {
    return {
        message: message,
        position: positionFromLexeme(lexeme)
    };
}

function createSemanticErrorAtPositionFactory(lexeme: ILexeme<Token>) {
    return function createSemanticErrorAtPosition(message: string) {
        return createSemanticError(message, lexeme);
    };
}

class CheckerVisitor extends BaseVisitor<ISemanticError[]> {
    private _scope = new Scope();

    //override
    public visitProgram(program: Nodes.Program): ISemanticError[] {
        return this.visitWithSymbolTable(program, prog => super.visitProgram(prog));
    }

    //override
    protected visitFunctionDeclaration(functionDeclaration: Nodes.FunctionDeclaration): ISemanticError[] {
        return this.visitWithSymbolTable(functionDeclaration, funcDeclaration => super.visitFunctionDeclaration(funcDeclaration));
    }

    protected processStatementListItems(processed: Processed.StatementListItems<ISemanticError[]>): ISemanticError[] {
        return flatten(processed.body);
    }

    protected processExpressionStatement(_node: Nodes.ExpressionStatement, processed: Processed.ExpressionStatement<ISemanticError[]>): ISemanticError[] {
        return processed.expression;
    }

    protected processReturnStatement(_node: Nodes.ReturnStatement, processed: Processed.ReturnStatement<ISemanticError[]>): ISemanticError[] {
        return processed.argument.match({ some: identity, none: thunk([]) });
    }

    protected processVariableStatement(node: Nodes.VariableStatement, processed: Processed.VariableStatement<ISemanticError[]>): ISemanticError[] {
        const idLexeme = node.id;
        const idSymbolName = symbolNameFromLexeme(idLexeme);
        const createSemanticError = createSemanticErrorAtPositionFactory(idLexeme);
        const symbolOrError = node.kind.match<ISymbol | ISemanticError>({
            some: kind => {
                if (this._scope.hasSybmolInCurrent(idSymbolName))
                    return createSemanticError(`Symbol '${idSymbolName}' already declared in scope`);

                const symbol = this._scope.addSymbolToCurrent({
                    lexeme: node.id,
                    kind: kind.token,
                    type: node.typeAnnotation.map(Nodes.typeFromTypeAnnotation)
                });
                return symbol instanceof Error
                    ? createSemanticError(symbol.message)
                    : symbol;
            },
            none: () => this._scope.lookUpSymbol(idSymbolName).match<ISymbol | ISemanticError>({
                some: identity,
                none: () => node.init.match({
                    some: () => createSemanticError(`Must provide a variable kind on first declaration for '${idSymbolName}'`),
                    none: () => createSemanticError(`Symbol '${idSymbolName}' not found`)
                })
            })
        });
        const initErrors = processed.init.match({ some: identity, none: thunk<ISemanticError[]>([]) })

        if (isSemanticError(symbolOrError))
            return [symbolOrError].concat(initErrors);

        const assignabilityErrors = !node.kind.isSome() && node.init.isSome() && symbolOrError.kind === Token.Const
            ? [createSemanticError(`Cannot reassign to const variable '${idSymbolName}'`)]
            : [];

        const initTypeErrors = node.init
            .flatMap(init => Nodes.patternMatchExpression<IOption<Tokens.PrimitiveType>>({
                baseExpression: expr => expr.type,
                identifier: id => this._scope.lookUpSymbol(symbolNameFromLexeme(id)).flatMap(symbol => symbol.type),
                literal: lit => some<Tokens.PrimitiveType>(Tokens.getTypeOfLiteral(lit.token))
            }, init))
            .flatMap(initType => symbolOrError.type
                .flatMap(symbolType => initType !== symbolType
                    ? some(createSemanticError(`Cannot assign expression of ${Token[initType]} to variable of ${Token[symbolType]} for variable '${idSymbolName}'`))
                    : none<ISemanticError>()
                )
            )
            .match({ some: error => [error], none: thunk([]) });

        return initErrors.concat(assignabilityErrors).concat(initTypeErrors);
    }

    protected processFunctionDeclaration(_node: Nodes.FunctionDeclaration, processed: Processed.FunctionDeclaration<ISemanticError[]>): ISemanticError[] {
        return flatten(processed.params).concat(processed.body);
    }

    protected processFunctionParameter(node: Nodes.FunctionParameter): ISemanticError[] {
        this._scope.addSymbolToCurrent({
            lexeme: node.id,
            kind: Token.Var,
            type: node.typeAnnotation.map(Nodes.typeFromTypeAnnotation)
        });
        return [];
    }

    protected processCallExpression(_node: Nodes.CallExpression, processed: Processed.CallExpression<ISemanticError[]>): ISemanticError[] {
        return flatten(processed.callArguments);
    }

    protected processUnaryExpression(_node: Nodes.UnaryExpression, processed: Processed.UnaryExpression<ISemanticError[]>): ISemanticError[] {
        return processed.argument;
    }

    protected processBinaryExpression<TToken extends Token>(_node: Nodes.BinaryExpression<TToken>, processed: Processed.BinaryExpression<ISemanticError[]>): ISemanticError[] {
        return processed.left.concat(processed.right);
    }

    protected processConditionalExpression(_node: Nodes.ConditionalExpression, processed: Processed.ConditionalExpression<ISemanticError[]>): ISemanticError[] {
        return processed.test.concat(processed.consequent).concat(processed.alternate);
    }

    protected processIdentifierExpression(lexeme: ILexeme<Tokens.Identifier>): ISemanticError[] {
        const symbolName = symbolNameFromLexeme(lexeme);
        return this._scope.lookUpSymbol(symbolName).match({
            some: thunk([]),
            none: () => [createSemanticError(`Symbol '${symbolName}' not found`, lexeme)]
        });
    }

    protected processLiteralExpression(_lexeme: ILexeme<Tokens.Literal>): ISemanticError[] {
        return [];
    }

    private visitWithSymbolTable<T extends IHasSymbolTable>(node: T, visitNode: (node: T) => ISemanticError[]) {
        this._scope.pushSymbolTable(node.getSymbolTable());
        const results = visitNode(node);
        this._scope.popSymbolTable();
        return results;
    }
}

export function check(program: Nodes.Program): ISemanticError[] {
    const checker = new CheckerVisitor();
    return checker.visitProgram(program);
}
