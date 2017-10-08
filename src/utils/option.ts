import { isNullOrUndefined } from "./value";

export interface IOption<T> {
    match<TResult>(args: {
        some: (value: T) => TResult;
        none: () => TResult;
    }): TResult;
    flatMap<TResult>(fn: (value: T) => IOption<TResult>): IOption<TResult>;
    map<TResult>(fn: (value: T) => TResult): IOption<TResult>;
    isSome(): this is ISome<T>;
}

export interface ISome<T> extends IOption<T> {
    getValue(): T;
}

abstract class Option<T> implements IOption<T> {
    match<TResult>(args: {
        some: (value: T) => TResult;
        none: () => TResult;
    }) {
        return this.isSome()
            ? args.some(this.getValue())
            : args.none();
    }

    flatMap<TResult>(fn: (value: T) => IOption<TResult>): IOption<TResult> {
        return this.match<IOption<TResult>>({
            some: fn,
            none: none
        });
    }

    map<TResult>(fn: (value: T) => TResult): IOption<TResult> {
        return this.match<IOption<TResult>>({
            some: val => {
                const result = fn(val);
                return isNullOrUndefined(result) ? none<TResult>() : some(result);
            },
            none: none
        });
    }

    isSome(): this is ISome<T> {
        return this instanceof Some;
    }
}

class None extends Option<any> {
    protected _isNone = true;
}
const _none: IOption<any> = new None();
export function none<T>(): IOption<T> {
    return _none;
}

class Some<T> extends Option<T> implements ISome<T> {
    constructor(private _value: T) {
        super();
        if (isNullOrUndefined(_value))
            throw new Error("Value for Some cannot be null or undefined");
    }
    public getValue() {
        return this._value;
    }
}
export function some<T>(value: T): ISome<T> {
    return new Some(value);
}

export function or<T>(left: IOption<T>, right: IOption<T>) {
    return left.isSome() ? left : right;
}
