export function memoizeById(fn) {
    const cache = new Map();
    return function(...args) {
        const id = args[0]?.id ?? JSON.stringify(args);
        if (cache.has(id)) return cache.get(id);
        
        const res = fn.apply(this, args);
        cache.set(id, res);
        return res;
    };
}