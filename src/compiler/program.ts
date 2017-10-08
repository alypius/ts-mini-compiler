import { lex } from "./lexer";
import { parse } from "./parser";
import { emit } from "./emitter";

export const simpleText = `function add(a: number, b: number) {
	return a + b;
}
var result = add(-1, 2);
log(result > 0 ? "Positive result " : "Negative result ", result);`

export function test() {
	const lexed = lex(simpleText);
	const parsed = parse(lexed);
	const parsedString = parsed.match({ some: program => JSON.stringify(program), none: () => "Error parsing" });
	const emittedString = parsed.match({ some: program => emit(program), none: () => "Error parsing" });
	return `
Parsed:
	${parsedString}
Emitted:
	${emittedString}
`;
}
