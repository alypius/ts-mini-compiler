import { Nodes } from "./parser";
import { ILexeme, Token } from "./lexer";
import { BaseVisitor, ProcessingArguments } from "./visitor";

class EmitterVisitor extends BaseVisitor<string> {
    protected processStatementListItems(args: ProcessingArguments.StatementListItems<string>): string {
        return args.body.join("\n");
    }

    protected processExpressionStatement(args: ProcessingArguments.ExpressionStatement<string>): string {
        return `${args.expression};`;
    }

    protected processReturnStatement(args: ProcessingArguments.ReturnStatement<string>): string {
        return args.argument.match({
            some: expression => `return ${expression};`,
            none: () => `return;`
        });
    }

    protected processVariableStatement(args: ProcessingArguments.VariableStatement<string>): string {
        const leftHandSide = `${this.emitLexeme(args.kind)} ${this.emitLexeme(args.id)}`;
        return args.init.match({
            some: expression => `${leftHandSide} = ${expression};`,
            none: () => `${leftHandSide};`
        });
    }

    protected processFunctionDeclaration(args: ProcessingArguments.FunctionDeclaration<string>): string {
        return `function ${this.emitLexeme(args.id)}(${args.params.join(", ")}) {
            ${args.body}
        }`;
    }

    protected processFunctionParameter(functionParameter: ProcessingArguments.FunctionParameter): string {
        return this.emitLexeme(functionParameter.id);
    }

    protected processCallExpression(args: ProcessingArguments.CallExpression<string>): string {
        return `${this.emitLexeme(args.callee)}(${args.callArguments.join(", ")})`;
    }

    protected processUnaryExpression(args: ProcessingArguments.UnaryExpression<string>): string {
        return `${this.emitLexeme(args.operator)}${args.argument}`;
    }

    protected processBinaryExpression(args: ProcessingArguments.BinaryExpression<string>): string {
        return `${args.left} ${this.emitLexeme(args.operator)} ${args.right}`;
    }

    protected processConditionalExpression(args: ProcessingArguments.ConditionalExpression<string>): string {
        return `${args.test} ? ${args.consequent} : ${args.alternate}`;
    }

    protected processLexemeExpression(args: ProcessingArguments.LexemeExpression): string {
        return this.emitLexeme(args.lexeme);
    }

    private emitLexeme<T extends Token>(lexeme: ILexeme<T>): string {
        return lexeme.value;
    }
}

export function emit(program: Nodes.Program): string {
    const emitter = new EmitterVisitor();
    return emitter.visitProgram(program);
}
