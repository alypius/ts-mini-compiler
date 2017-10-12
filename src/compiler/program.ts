import { lex } from "./lexer";
import { parse } from "./parser";
import { check } from "./checker";
import { emit } from "./emitter";

export const simpleText = `function add(a: number, b: number) {
	return a + b;
}
var result = add(-1, 2);
log(result > 0 ? "Positive result " : "Negative result ", result);`

const _errorParsing = "Error parsing";

export function test() {
	const lexed = lex(simpleText);
	const parsed = parse(lexed);
	const parsedString = parsed.match({ some: program => JSON.stringify(program), none: () => _errorParsing });
	const checkerErrors = parsed.match({ some: program => check(program).map(it => it.message), none: () => [_errorParsing] });
	const emittedString = checkerErrors.length === 0
		? parsed.match({ some: program => emit(program), none: () => _errorParsing })
		: checkerErrors.join(", ");
	return `
Parsed:
	${parsedString}
Emitted:
	${emittedString}
`;
}
