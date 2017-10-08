import { Lexer, Program } from "ts-mini-compiler";
import { assert } from "chai";

describe("Lexer", function () {
    it("Empty string should return empty array", function () {
        assert.deepEqual(Lexer.lex(""), []);
    });

    it("Simple text should lex", function () {
        assert.equal(Lexer.lex(Program.simpleText).length, 42);
    });
});
