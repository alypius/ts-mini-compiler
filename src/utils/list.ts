import { IOption, ISome, some, none } from "./option";

export function getFirst<T>(list: T[] | null): IOption<T> {
	return list && list.length > 0 ? some(list[0]) : none<T>();
}

export function getLast<T>(list: T[] | null): IOption<T> {
	return list && list.length > 0 ? some(list[list.length - 1]) : none<T>();
}

export function pushList<T>(destination: T[], source: T[]) {
	source.forEach(it => {
		destination.push(it);
	});
}

export function flatten<T>(listOfLists: T[][]): T[] {
	const flattened: T[] = [];
	listOfLists.forEach(it => {
		pushList(flattened, it);
	});
	return flattened;
}

export function flatMap<T, TResult>(list: T[], fn: (value: T) => TResult[]): TResult[] {
	return flatten(list.map(fn));
}

export function find<T>(list: T[], predicate: (value: T) => boolean): IOption<T> {
	for (let i = 0, len = list.length; i < len; i++)
		if (predicate(list[i])) return some(list[i]);
	return none<T>();
}

export function filterSome<T>(options: IOption<T>[]): T[] {
	const filtered = <ISome<T>[]>options.filter(it => it.isSome());
	return filtered.map(it => it.getValue());
}

export function contains<T>(list: T[], item: T) {
	return list.indexOf(item) >= 0;
}
