export function isNullOrUndefined<T>(value: T) {
    return value === null || value === undefined;
}

export function hasValue<T>(value: T) {
    return !isNullOrUndefined(value)
        && (typeof value === "string" ? value !== "" : true)
        && (typeof value === "number" ? !isNaN(value) : true);
}

export function createMemoizeSingleParameter<TInput>(toHash: (input: TInput) => string) {
    const caches: { [key: string]: any }[] = [];

    function clearMemoization() {
        caches.forEach(cache => {
            for (let key in cache)
                delete cache[key];
        });
    }

    function memoizeSingleParameter<TOutput>(fn: (input: TInput) => TOutput) {
        const cache: { [key: string]: TOutput } = {};
        caches.push(cache);
        return function memoized(input: TInput) {
            const hash = toHash(input);
            if (isNullOrUndefined(cache[hash]))
                cache[hash] = fn(input);
            return cache[hash];
        };
    }

    return { memoize: memoizeSingleParameter, clearMemoization };
}
