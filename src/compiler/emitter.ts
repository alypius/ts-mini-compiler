import { Nodes } from "./parser";
import { ILexeme, Token, Tokens } from "./lexer";
import { BaseVisitor, Processed } from "./visitor";

class EmitterVisitor extends BaseVisitor<string> {
    protected processStatementListItems(processed: Processed.StatementListItems<string>): string {
        return processed.body.join("\n");
    }

    protected processExpressionStatement(_node: Nodes.ExpressionStatement, processed: Processed.ExpressionStatement<string>): string {
        return `${processed.expression};`;
    }

    protected processReturnStatement(_node: Nodes.ReturnStatement, processed: Processed.ReturnStatement<string>): string {
        return processed.argument.match({
            some: expression => `return ${expression};`,
            none: () => `return;`
        });
    }

    protected processVariableStatement(node: Nodes.VariableStatement, processed: Processed.VariableStatement<string>): string {
        const idLexeme = this.emitLexeme(node.id);
        const leftHandSide = node.kind.match({
            some: kind => `${this.emitLexeme(kind)} ${idLexeme}`,
            none: () => idLexeme
        });
        return processed.init.match({
            some: expression => `${leftHandSide} = ${expression};`,
            none: () => `${leftHandSide};`
        });
    }

    protected processFunctionDeclaration(node: Nodes.FunctionDeclaration, processed: Processed.FunctionDeclaration<string>): string {
        return `function ${this.emitLexeme(node.id)}(${processed.params.join(", ")}) {
            ${processed.body}
        }`;
    }

    protected processFunctionParameter(node: Nodes.FunctionParameter): string {
        return this.emitLexeme(node.id);
    }

    protected processCallExpression(node: Nodes.CallExpression, processed: Processed.CallExpression<string>): string {
        return `${this.emitLexeme(node.callee)}(${processed.callArguments.join(", ")})`;
    }

    protected processUnaryExpression(node: Nodes.UnaryExpression, processed: Processed.UnaryExpression<string>): string {
        return `${this.emitLexeme(node.operator)}${processed.argument}`;
    }

    protected processBinaryExpression<TToken extends Token>(node: Nodes.BinaryExpression<TToken>, processed: Processed.BinaryExpression<string>): string {
        return `${processed.left} ${this.emitLexeme(node.operator)} ${processed.right}`;
    }

    protected processConditionalExpression(_node: Nodes.ConditionalExpression, processed: Processed.ConditionalExpression<string>): string {
        return `${processed.test} ? ${processed.consequent} : ${processed.alternate}`;
    }

    protected processIdentifierExpression(lexeme: ILexeme<Tokens.Identifier>): string {
        return this.emitLexeme(lexeme);
    }

    protected processLiteralExpression(lexeme: ILexeme<Tokens.Literal>): string {
        return this.emitLexeme(lexeme);
    }

    private emitLexeme<T extends Token>(lexeme: ILexeme<T>): string {
        return lexeme.value;
    }
}

export function emit(program: Nodes.Program): string {
    const emitter = new EmitterVisitor();
    return emitter.visitProgram(program);
}
