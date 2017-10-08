import { ILexeme, Tokens, Token } from "./lexer";
import { IOption, none, some } from "utils/option";
import { createMemoizeSingleParameter } from "utils/value";

export interface IParser {
    matchTokenPredicate<T extends Token>(tokenPredicate: (token: Token) => token is T): IOption<ILexeme<T>>;
    matchSingleToken<T extends Token>(token: T): IOption<ILexeme<T>>;
    matchList<T>(parse: (parser: IParser) => IOption<T>, seperatorTokenPredicate?: (token: Token) => token is Token): T[];
    matchOneOf<T>(parseFns: ((parser: IParser) => IOption<T>)[]): IOption<T>;
    getPosition(): number;
    isAtEOF(): boolean;
}

class Parser implements IParser {
    private _position = 0;

    constructor(private _lexemes: ILexeme<Token>[]) { }

    public matchTokenPredicate<T extends Token>(tokenPredicate: (token: Token) => token is T): IOption<ILexeme<T>> {
        return this.getCurrentLexeme().flatMap(lexeme => {
            if (tokenPredicate(lexeme.token)) {
                this._position++;
                return some(<ILexeme<T>>lexeme);
            }
            return none<ILexeme<T>>();
        });
    }

    public matchSingleToken<T extends Token>(token: T): IOption<ILexeme<T>> {
        return this.matchTokenPredicate(Tokens.createIsToken(token));
    }

    public matchList<T>(parse: (parser: IParser) => IOption<T>, seperatorTokenPredicate?: (token: Token) => token is Token): T[] {
        const items: T[] = [];
        let item: IOption<T>;
        do {
            item = parse(this);
            if (item.isSome())
                items.push(item.getValue());
        } while (item.isSome() && (!seperatorTokenPredicate || this.matchTokenPredicate(seperatorTokenPredicate).isSome()));
        return items;
    }

    public matchOneOf<T>(parseFns: ((parser: IParser) => IOption<T>)[]): IOption<T> {
        const originalPosition = this._position;
        for (let parse of parseFns) {
            const result = parse(this);
            if (result.isSome())
                return result;
            else
                this._position = originalPosition;
        }
        return none<T>();
    }

    public getPosition(): number {
        return this._position;
    }

    public isAtEOF(): boolean {
        return this._position >= this._lexemes.length;
    }

    private getCurrentLexeme(): IOption<ILexeme<Token>> {
        return !this.isAtEOF()
            ? some(this._lexemes[this._position])
            : none<ILexeme<Token>>();
    }
}

export function parse(lexemes: ILexeme<Token>[]): IOption<Nodes.Program> {
    return Nodes.parseProgram(lexemes);
}

export namespace Nodes {
    const { memoize, clearMemoization } = createMemoizeSingleParameter((parser: IParser) => parser.getPosition().toString());

    export type TypeAnnotation = ILexeme<Tokens.PrimitiveType>;
    function parseTypeAnnotation(parser: IParser): IOption<TypeAnnotation> {
        return parser.matchSingleToken(Token.Colon)
            .flatMap(() => parser.matchTokenPredicate(Tokens.isPrimitiveType));
    }

    export type StatementListItem = Statement | FunctionDeclaration;
    function parseStatementListItem(parser: IParser): IOption<StatementListItem> {
        return parser.matchOneOf<StatementListItem>([FunctionDeclaration.parse, parseStatement]);
    }

    export type Statement = ExpressionStatement | ReturnStatement | VariableStatement;
    function parseStatement(parser: IParser): IOption<Statement> {
        return parser.matchOneOf<Statement>([ReturnStatement.parse, VariableStatement.parse, ExpressionStatement.parse]);
    }

    export type Expression = CallExpression
        | UnaryExpression
        | MultiplicativeExpression
        | AdditiveExpression
        | RelationalExpression
        | EqualityExpression
        | LogicalAndExpression
        | LogicalOrExpression
        | ConditionalExpression
        | ILexeme<Tokens.Identifier>
        | ILexeme<Tokens.Literal>;

    function parseExpression(parser: IParser): IOption<Expression> {
        return ConditionalExpression.parse(parser);
    }

    function createParseForTokenPredicate<T extends Token>(tokenPredicate: (token: Token) => token is T) {
        return memoize(function parseForTokenPredicate(parser: IParser): IOption<ILexeme<T>> {
            return parser.matchTokenPredicate(tokenPredicate);
        });
    }

    export function parseProgram(lexemes: ILexeme<Token>[]): IOption<Nodes.Program> {
        clearMemoization();
        return Program.parse(new Parser(lexemes));
    }

    export class Program {
        static parse = memoize(function parse(parser: IParser): IOption<Program> {
            const program = new Program({ body: parser.matchList(parseStatementListItem) });
            return parser.isAtEOF() ? some(program) : none<Program>();
        });

        constructor(private _components: { body: StatementListItem[] }) { }

        get body(): StatementListItem[] { return this._components.body; }
    }

    export class ExpressionStatement {
        static parse = memoize(function parse(parser: IParser): IOption<ExpressionStatement> {
            return CallExpression.parse(parser)
                .flatMap(expression => parser.matchSingleToken(Token.SemiColon)
                    .map(() => new ExpressionStatement({ expression }))
                );
        });

        constructor(private _components: { expression: Expression }) { }

        get expression(): Expression { return this._components.expression; }
    }

    export class ReturnStatement {
        static parse = memoize(function parse(parser: IParser): IOption<ReturnStatement> {
            return parser.matchSingleToken(Token.Return)
                .flatMap(() => {
                    const argument = parseExpression(parser);
                    return parser.matchSingleToken(Token.SemiColon)
                        .map(() => new ReturnStatement({ argument }));
                });
        });

        constructor(private _components: { argument: IOption<Expression> }) { }

        get argument(): IOption<Expression> { return this._components.argument; }
    }

    export class VariableStatement {
        static parse = memoize(function parse(parser: IParser): IOption<VariableStatement> {
            return parser.matchTokenPredicate(Tokens.isVariableKind)
                .flatMap(kind => parser.matchTokenPredicate(Tokens.isIdentifier)
                    .flatMap(id => {
                        const typeAnnotation = parseTypeAnnotation(parser);
                        const init = parser.matchSingleToken(Token.Assign)
                            .flatMap(() => parseExpression(parser));
                        return parser.matchSingleToken(Token.SemiColon)
                            .map(() => new VariableStatement({ kind, id, typeAnnotation, init }));
                    })
                );
        });

        constructor(private _components: {
            kind: ILexeme<Tokens.VariableKind>;
            id: ILexeme<Tokens.Identifier>;
            typeAnnotation: IOption<TypeAnnotation>;
            init: IOption<Expression>;
        }) { }

        get kind(): ILexeme<Tokens.VariableKind> { return this._components.kind; }
        get id(): ILexeme<Tokens.Identifier> { return this._components.id; }
        get typeAnnotation(): IOption<TypeAnnotation> { return this._components.typeAnnotation; }
        get init(): IOption<Expression> { return this._components.init; }
    }

    export class FunctionDeclaration {
        static parse = memoize(function parse(parser: IParser): IOption<FunctionDeclaration> {
            return parser.matchSingleToken(Token.Function)
                .flatMap(() => parser.matchTokenPredicate(Tokens.isIdentifier)
                    .flatMap(id => parser.matchSingleToken(Token.OpenParen)
                        .flatMap(() => {
                            const params = parser.matchList(FunctionParameter.parse, Tokens.createIsToken(Token.Comma));
                            return parser.matchSingleToken(Token.CloseParen)
                                .flatMap(() => {
                                    const returnTypeAnnotation = parseTypeAnnotation(parser);
                                    return parser.matchSingleToken(Token.OpenBrace)
                                        .flatMap(() => {
                                            const body = parser.matchList(parseStatementListItem);
                                            return parser.matchSingleToken(Token.CloseBrace)
                                                .map(() => new FunctionDeclaration({ id, params, returnTypeAnnotation, body }));
                                        });
                                });
                        })
                    )
                );
        });

        constructor(private _components: {
            id: ILexeme<Tokens.Identifier>;
            params: FunctionParameter[];
            returnTypeAnnotation: IOption<TypeAnnotation>;
            body: StatementListItem[];
        }) { }

        get id(): ILexeme<Tokens.Identifier> { return this._components.id; }
        get params(): FunctionParameter[] { return this._components.params; }
        get returnTypeAnnotation(): IOption<TypeAnnotation> { return this._components.returnTypeAnnotation; }
        get body(): StatementListItem[] { return this._components.body; }
    }

    export class FunctionParameter {
        static parse = memoize(function parse(parser: IParser): IOption<FunctionParameter> {
            return parser.matchTokenPredicate(Tokens.isIdentifier)
                .map(id => {
                    const typeAnnotation = parseTypeAnnotation(parser);
                    return new FunctionParameter({ id: id, typeAnnotation });
                });
        });

        constructor(private _components: {
            id: ILexeme<Tokens.Identifier>;
            typeAnnotation: IOption<TypeAnnotation>;
        }) { }

        get id(): ILexeme<Tokens.Identifier> { return this._components.id; }
        get typeAnnotation(): IOption<TypeAnnotation> { return this._components.typeAnnotation; }
    }

    export class CallExpression {
        static parse(parser: IParser): IOption<Expression> {
            const parseCallExpression = memoize(function parseCallExpression(parser: IParser): IOption<CallExpression> {
                return parser.matchTokenPredicate(Tokens.isIdentifier)
                    .flatMap(callee => parser.matchSingleToken(Token.OpenParen)
                        .flatMap(() => {
                            const callArguments = parser.matchList(parseExpression, Tokens.createIsToken(Token.Comma));
                            return parser.matchSingleToken(Token.CloseParen)
                                .map(() => new CallExpression({ callee, callArguments }));
                        })
                    );
            });
            const parseParenthesizedExpression = memoize(function parseParenthesizedExpression(parser: IParser): IOption<Expression> {
                return parser.matchSingleToken(Token.OpenParen)
                    .flatMap(() => parseExpression(parser)
                        .flatMap(expression => parser.matchSingleToken(Token.CloseParen)
                            .map(() => expression)
                        )
                    );
            });
            return parser.matchOneOf<Expression>([
                parseCallExpression,
                parseParenthesizedExpression,
                createParseForTokenPredicate(Tokens.isIdentifier),
                createParseForTokenPredicate(Tokens.isLiteral)
            ]);
        }

        constructor(private _components: {
            callee: ILexeme<Tokens.Identifier>;
            callArguments: Expression[];
        }) { }

        get callee(): ILexeme<Tokens.Identifier> { return this._components.callee; }
        get callArguments(): Expression[] { return this._components.callArguments; }
    }

    export class UnaryExpression {
        static parse(parser: IParser): IOption<Expression> {
            const parseUnaryExpression = memoize(function parseUnaryExpression(parser: IParser): IOption<UnaryExpression> {
                return parser.matchTokenPredicate(Tokens.isUnaryOperator)
                    .flatMap(operator => UnaryExpression.parse(parser)
                        .map(argument => new UnaryExpression({ operator, argument }))
                    );
            });
            return parser.matchOneOf<Expression>([parseUnaryExpression, CallExpression.parse]);
        }

        constructor(private _components: {
            operator: ILexeme<Tokens.UnaryOperator>;
            argument: Expression;
        }) { }

        get operator(): ILexeme<Tokens.UnaryOperator> { return this._components.operator; }
        get argument(): Expression { return this._components.argument; }
    }

    export abstract class BinaryExpression<T extends Token> {
        static createParseBinaryExpression<T extends Token>(
            getParseSelf: () => (parser: IParser) => IOption<Expression>,
            parseOther: (parser: IParser) => IOption<Expression>,
            isOperatorPredicate: (token: Token) => token is T,
            createExpression: (args: { left: Expression, right: Expression, operator: ILexeme<T> }) => Expression
        ) {
            function parseBinaryExpression(parser: IParser): IOption<Expression> {
                return parseOther(parser)
                    .flatMap(left => parser.matchTokenPredicate(isOperatorPredicate)
                        .flatMap(operator => getParseSelf()(parser)
                            .map(right => createExpression({ left, right, operator }))
                        )
                    );
            }
            return function parse(parser: IParser): IOption<Expression> {
                return parser.matchOneOf<Expression>([parseBinaryExpression, parseOther]);
            };
        }

        constructor(private _components: {
            operator: ILexeme<T>;
            left: Expression;
            right: Expression;
        }) { }

        get operator(): ILexeme<T> { return this._components.operator; }
        get left(): Expression { return this._components.left; }
        get right(): Expression { return this._components.right; }
    }

    export class MultiplicativeExpression extends BinaryExpression<Tokens.MultiplicativeOperator> {
        static parse: (parser: IParser) => IOption<Expression> = BinaryExpression.createParseBinaryExpression(
            () => MultiplicativeExpression.parse,
            UnaryExpression.parse,
            Tokens.isMultiplicativeOperator,
            args => new MultiplicativeExpression(args));
    }
    export class AdditiveExpression extends BinaryExpression<Tokens.AdditiveOperator> {
        static parse: (parser: IParser) => IOption<Expression> = BinaryExpression.createParseBinaryExpression(
            () => AdditiveExpression.parse,
            MultiplicativeExpression.parse,
            Tokens.isAdditiveOperator,
            args => new AdditiveExpression(args));
    }
    export class RelationalExpression extends BinaryExpression<Tokens.RelationalOperator> {
        static parse: (parser: IParser) => IOption<Expression> = BinaryExpression.createParseBinaryExpression(
            () => RelationalExpression.parse,
            AdditiveExpression.parse,
            Tokens.isRelationalOperator,
            args => new RelationalExpression(args));
    }
    export class EqualityExpression extends BinaryExpression<Tokens.EqualityOperator> {
        static parse: (parser: IParser) => IOption<Expression> = BinaryExpression.createParseBinaryExpression(
            () => EqualityExpression.parse,
            RelationalExpression.parse,
            Tokens.isEqualityOperator,
            args => new EqualityExpression(args));
    }
    export class LogicalAndExpression extends BinaryExpression<Token.And> {
        static parse: (parser: IParser) => IOption<Expression> = BinaryExpression.createParseBinaryExpression(
            () => LogicalAndExpression.parse,
            EqualityExpression.parse,
            Tokens.createIsToken(Token.And),
            args => new LogicalAndExpression(args));
    }
    export class LogicalOrExpression extends BinaryExpression<Token.Or> {
        static parse: (parser: IParser) => IOption<Expression> = BinaryExpression.createParseBinaryExpression(
            () => LogicalOrExpression.parse,
            LogicalAndExpression.parse,
            Tokens.createIsToken(Token.Or),
            args => new LogicalOrExpression(args));
    }

    export class ConditionalExpression {
        static parse(parser: IParser): IOption<Expression> {
            const parseConditionalExpression = memoize(function parseConditionalExpression(parser: IParser): IOption<ConditionalExpression> {
                return LogicalOrExpression.parse(parser)
                    .flatMap(test => parser.matchSingleToken(Token.QuestionMark)
                        .flatMap(() => ConditionalExpression.parse(parser)
                            .flatMap(consequent => parser.matchSingleToken(Token.Colon)
                                .flatMap(() => ConditionalExpression.parse(parser)
                                    .map(alternate => new ConditionalExpression({ test, consequent, alternate }))
                                )
                            )
                        )
                    );
            });
            return parser.matchOneOf<Expression>([parseConditionalExpression, LogicalOrExpression.parse]);
        }

        constructor(private _components: {
            test: Expression;
            consequent: Expression;
            alternate: Expression;
        }) { }

        get test(): Expression { return this._components.test; }
        get consequent(): Expression { return this._components.consequent; }
        get alternate(): Expression { return this._components.alternate; }
    }
}
