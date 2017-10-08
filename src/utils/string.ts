import { getFirst } from "./list";
import { IOption, none } from "./option";

export function matchesTextAtPosition(str: string, pos: number, text: string): boolean {
	return str.slice(pos, pos + text.length) === text;
}

export function createMatchRegExp(str: string) {
	return function matchRegExp(regexp: RegExp): IOption<string> {
		return regexp.test(str) ? getFirst(regexp.exec(str)) : none<string>();
	};
}