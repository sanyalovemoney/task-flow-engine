export function memoizeById(fn) {
    const cache = new Map();

    const memoizedFn = function(...args) {
        const id = (args[0] && typeof args[0] === 'object' && args[0].id) || JSON.stringify(args);

        if (id === undefined) {
            console.warn("Warning: No valid ID.");
            return fn.apply(this, args);
        }

        if (cache.has(id)) {
            console.log(`Cache hit for id: ${id}`);
            return cache.get(id);
        }

        console.log(`Cache miss for id: ${id}`);
        const result = fn.apply(this, args);
        cache.set(id, result);
        return result;
    };
    Object.defineProperty(memoizedFn, 'name', { value: fn.name || 'unknown' });
    return memoizedFn;
}