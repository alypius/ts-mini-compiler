import { ILexeme, Tokens, Token } from "./lexer";
import { IOption, none, some } from "utils/option";
import { isNullOrUndefined } from "utils/value";
import { getLast } from "utils/list";

export interface ISymbol {
    lexeme: ILexeme<Token>;
    type: IOption<Tokens.PrimitiveType>;
    kind: Tokens.VariableKind;
}

export interface IHasSymbolTable {
    getSymbolTable(): SymbolTable;
}

export function symbolNameFromLexeme(lexeme: ILexeme<Token>) {
    return lexeme.value;
}

export class SymbolTable {
    private _dict: { [key: string]: ISymbol } = {};

    public getSymbol(symbolName: string): IOption<ISymbol> {
        const symbol = this._dict[symbolName];
        return !isNullOrUndefined(symbol) ? some(symbol) : none<ISymbol>();
    }

    public addSymbol(symbol: ISymbol): ISymbol | Error {
        const symbolName = symbolNameFromLexeme(symbol.lexeme);
        if (!isNullOrUndefined(this._dict[symbolName]))
            return new Error(`Symbol ${symbolName} already present`);
        this._dict[symbolName] = symbol;
        return symbol;
    }
}

export class Scope {
    private _symbolTables: SymbolTable[] = [];

    public pushSymbolTable(symbolTable: SymbolTable): void {
        this._symbolTables.push(symbolTable);
    }

    public popSymbolTable(): SymbolTable | Error {
        const popped = this._symbolTables.pop();
        if (isNullOrUndefined(popped))
            return new Error("Cannot pop from an empty stack");
        return popped;
    }

    public lookUpSymbol(symbolName: string): IOption<ISymbol> {
        for (let i = this._symbolTables.length - 1; i >= 0; i--) {
            const symbol = this._symbolTables[i].getSymbol(symbolName);
            if (symbol.isSome()) return symbol;
        }
        return none<ISymbol>();
    }

    public hasSybmolInCurrent(symbolName: string): boolean {
        return getLast(this._symbolTables).match({
            some: symbolTable => symbolTable.getSymbol(symbolName).isSome(),
            none: () => false
        });
    }

    public addSymbolToCurrent(symbol: ISymbol): ISymbol | Error {
        return getLast(this._symbolTables).match({
            some: symbolTable => symbolTable.addSymbol(symbol),
            none: () => new Error("No symbol tables on stack")
        });
    }
}
