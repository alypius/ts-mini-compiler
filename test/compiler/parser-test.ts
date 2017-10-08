import { Lexer, Parser, Program, Option } from "ts-mini-compiler";
import { assert } from "chai";

describe("Parser", function () {
    it("Empty array should return empty program", function () {
        assert.deepEqual(Parser.parse([]), Option.some(new Parser.Nodes.Program({ body: [] })));
    });

    it("Simple text should parse", function () {
        assert.equal(Parser.parse(Lexer.lex(Program.simpleText)).match({ some: program => program.body.length, none: () => 0 }), 3);
    });
});
