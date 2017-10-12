import { getLast, filterSome, flatMap, contains } from "utils/list";
import { matchesTextAtPosition, createMatchRegExp } from "utils/string";
import { IOption, or as optionOr } from "utils/option";

export enum Token {
	OpenParen,
	CloseParen,
	OpenBrace,
	CloseBrace,
	SemiColon,
	Comma,
	Assign,
	QuestionMark,
	Colon,
	Dot,
	Plus,
	Minus,
	Not,
	Multiply,
	Divide,
	Modulus,
	LessThan,
	GreaterThan,
	LessThanEquals,
	GreaterThanEquals,
	Equals,
	NotEquals,
	IdentityEquals,
	IdentityNotEquals,
	And,
	Or,
	Var,
	Const,
	Let,
	Return,
	Function,
	True,
	False,
	StringType,
	NumberType,
	BooleanType,
	DecimalLiteral,
	Identifier,
	StringLiteral
};

const knownLexemes: [Token, string][] = [
	[Token.OpenParen, '('],
	[Token.CloseParen, ')'],
	[Token.OpenBrace, '{'],
	[Token.CloseBrace, '}'],
	[Token.SemiColon, ';'],
	[Token.Comma, ','],
	[Token.Assign, '='],
	[Token.QuestionMark, '?'],
	[Token.Colon, ':'],
	[Token.Dot, '.'],
	[Token.Plus, '+'],
	[Token.Minus, '-'],
	[Token.Not, '!'],
	[Token.Multiply, '*'],
	[Token.Divide, '/'],
	[Token.Modulus, '%'],
	[Token.LessThan, '<'],
	[Token.GreaterThan, '>'],
	[Token.LessThanEquals, '<='],
	[Token.GreaterThanEquals, '>='],
	[Token.Equals, '=='],
	[Token.NotEquals, '!='],
	[Token.IdentityEquals, '==='],
	[Token.IdentityNotEquals, '!=='],
	[Token.And, '&&'],
	[Token.Or, '||'],
	[Token.Var, 'var'],
	[Token.Const, 'const'],
	[Token.Let, 'let'],
	[Token.Return, 'return'],
	[Token.Function, 'function'],
	[Token.True, 'true'],
	[Token.False, 'false'],
	[Token.StringType, 'string'],
	[Token.NumberType, 'number'],
	[Token.BooleanType, 'boolean']
];

const knownRegExps: [Token, RegExp[]][] = [
	[Token.DecimalLiteral, [/^[0-9]+\\.[0-9]*/, /^[0-9]+/]],
	[Token.Identifier, [/^[a-zA-Z_][a-zA-Z0-9_]*/]],
	[Token.StringLiteral, [/^"[^"]*"/, /^'[^']'*/]]
];

function matchKnownLexeme(str: string, pos: number): IOption<[Token, string]> {
	return getLast(knownLexemes.filter(([_, text]) => matchesTextAtPosition(str, pos, text)));
}

function matchKnownRegExp(str: string, pos: number): IOption<[Token, string]> {
	const matchRegExp = createMatchRegExp(str.slice(pos));
	return getLast(flatMap(
		knownRegExps,
		([token, regexps]) => filterSome(regexps.map(matchRegExp))
			.map<[Token, string]>(str => [token, str])
	));
}

export interface IPosition {
	lineNum: number;
	colNum: number;
}

export interface ILexeme<T extends Token> extends IPosition {
	token: T;
	value: string;
}

export function positionFromLexeme(lexeme: ILexeme<Token>): IPosition {
	return { lineNum: lexeme.lineNum, colNum: lexeme.colNum };
}

export function isLexeme<T extends Token>(lexeme: ILexeme<T>): lexeme is ILexeme<T> {
	return lexeme.lineNum !== undefined
		&& lexeme.colNum !== undefined
		&& lexeme.token !== undefined
		&& lexeme.value !== undefined;
}

export namespace Tokens {
	export function createIsToken<T extends Token>(expectedToken: T) {
		return function isToken(actualToken: Token): actualToken is T {
			return actualToken === expectedToken;
		};
	}

	export type Identifier = Token.Identifier;
	export const isIdentifier = createIsToken(Token.Identifier);

	export type Literal = Token.StringLiteral | Token.DecimalLiteral | Token.True | Token.False;
	export function isLiteral(token: Token): token is Literal {
		return contains([
			Token.StringLiteral,
			Token.DecimalLiteral,
			Token.True,
			Token.False
		], token);
	}

	export type PrimitiveType = Token.StringType | Token.NumberType | Token.BooleanType;
	export function isPrimitiveType(token: Token): token is PrimitiveType {
		return contains([
			Token.StringType,
			Token.NumberType,
			Token.BooleanType
		], token);
	}

	export function getTypeOfLiteral(token: Literal): PrimitiveType {
		if (token === Token.StringLiteral)
			return Token.StringType;
		else if (token === Token.DecimalLiteral)
			return Token.NumberType;
		else if (token === Token.True || token === Token.False)
			return Token.BooleanType;
		else
			throw new Error("Unknown literal");
	}

	export type VariableKind = Token.Var | Token.Let | Token.Const;
	export function isVariableKind(token: Token): token is VariableKind {
		return contains([
			Token.Var,
			Token.Let,
			Token.Const
		], token);
	}

	export type UnaryOperator = Token.Not;
	export function isUnaryOperator(token: Token): token is UnaryOperator {
		return contains([Token.Not, Token.Minus], token);
	}

	export type MultiplicativeOperator = Token.Multiply | Token.Divide | Token.Modulus;
	export function isMultiplicativeOperator(token: Token): token is MultiplicativeOperator {
		return contains([
			Token.Multiply,
			Token.Divide,
			Token.Modulus
		], token);
	}

	export type AdditiveOperator = Token.Plus | Token.Minus;
	export function isAdditiveOperator(token: Token): token is AdditiveOperator {
		return contains([
			Token.Plus,
			Token.Minus
		], token);
	}

	export type RelationalOperator = Token.LessThan | Token.LessThanEquals | Token.GreaterThan | Token.GreaterThanEquals;
	export function isRelationalOperator(token: Token): token is RelationalOperator {
		return contains([
			Token.LessThan,
			Token.LessThanEquals,
			Token.GreaterThan,
			Token.GreaterThanEquals
		], token);
	}

	export type EqualityOperator = Token.Equals | Token.NotEquals | Token.LessThan | Token.LessThanEquals | Token.GreaterThan | Token.GreaterThanEquals;
	export function isEqualityOperator(token: Token): token is EqualityOperator {
		return contains([
			Token.Equals,
			Token.NotEquals
		], token);
	}
}

export function lex(str: string) {
	const lexed: ILexeme<Token>[] = [];
	let lineNum = 1;
	let colNum = 1;

	const len = str.length;
	let pos = 0;
	while (pos < len) {
		const knownLexeme = optionOr(matchKnownLexeme(str, pos), matchKnownRegExp(str, pos));
		if (knownLexeme.isSome()) {
			const [token, value] = knownLexeme.getValue();
			lexed.push({ lineNum, colNum, token, value });
			pos += value.length;
			colNum += value.length;
		} else if (matchesTextAtPosition(str, pos, "\n")) {
			pos += 1;
			lineNum++;
			colNum = 1;
		} else if (matchesTextAtPosition(str, pos, "\t") || matchesTextAtPosition(str, pos, " ")) {
			pos += 1;
			colNum += 1;
		} else
			throw new Error("Unknown token beginning at " + str.slice(pos, pos + 10) + "...");
	}
	return lexed;
}
