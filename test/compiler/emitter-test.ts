import { Lexer, Parser, Program, Emitter } from "ts-mini-compiler";
import { assert } from "chai";

describe("Parser", function () {
    it("Empty program should return empty string", function () {
        assert.equal(Emitter.emit(new Parser.Nodes.Program({ body: [] })), "");
    });

    it("Simple text should emit correctly", function () {
        assert.equal(
            Parser.parse(Lexer.lex(Program.simpleText)).match({ some: program => Emitter.emit(program).replace(/\s+/g, " "), none: () => "" }),
            `function add(a, b) { return a + b; } var result = add(-1, 2); log(result > 0 ? "Positive result " : "Negative result ", result);`
        );
    });
});
