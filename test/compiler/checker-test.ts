import { Lexer, Parser, Program, Checker } from "ts-mini-compiler";
import { assert } from "chai";

describe("Checker", function () {
    it("Empty program should return empty array", function () {
        assert.deepEqual(Checker.check(new Parser.Nodes.Program({ body: [] })), []);
    });

    function getCheckerMessages(text: string) {
        return Parser.parse(Lexer.lex(text)).match({ some: program => Checker.check(program).map(it => it.message).join(", "), none: () => "Eror parsing" });
    }

    it("Simple text should type-check without error", function () {
        assert.equal(getCheckerMessages(Program.simpleText), "");
    });

    it("Redeclaration check", function () {
        assert.equal(getCheckerMessages(`var x = 1; x = 2;`), "");
        assert.equal(getCheckerMessages(`var x = 1; var y = 2;`), "");
        assert.equal(getCheckerMessages(`var x = 1; var x = 2;`), "Symbol 'x' already declared in scope");
    });

    it("Variable kind check", function () {
        assert.equal(getCheckerMessages(`let x = 1;`), "");
        assert.equal(getCheckerMessages(`const x = 1;`), "");
        assert.equal(getCheckerMessages(`x = 1;`), "Must provide a variable kind on first declaration for 'x'");
    });

    it("Reassigment check", function () {
        assert.equal(getCheckerMessages(`let x = 1; x = 2;`), "");
        assert.equal(getCheckerMessages(`const x = 1; x = 2;`), "Cannot reassign to const variable 'x'");
    });

    it("Assignability check", function () {
        assert.equal(getCheckerMessages(`var x: number = 4;`), "");
        assert.equal(getCheckerMessages(`var x: string = 4;`), "Cannot assign expression of NumberType to variable of StringType for variable 'x'");
    });

    it("Use without declare check", function () {
        assert.equal(getCheckerMessages(`var x = 1; x;`), "");
        assert.equal(getCheckerMessages(`var x = 1; function q(a) { a; x; } x;`), "");
        assert.equal(getCheckerMessages(`var x = 1; y;`), "Symbol 'y' not found");
        assert.equal(getCheckerMessages(`function q(a) { b; }`), "Symbol 'b' not found");
        assert.equal(getCheckerMessages(`function q(a) { a; } a;`), "Symbol 'a' not found");
    });
});
