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

export function memoizeAdvanced(fn, { maxSize = Infinity, strategy = 'LRU', ttl = null } = {}) {
    const cache = new Map(), meta = new Map();
    
    const evict = () => {
        let key;
        if (strategy === 'LRU') key = cache.keys().next().value; 
        if (strategy === 'LFU') key = [...meta].reduce((a, b) => a[1].f < b[1].f ? a : b)[0];
        if (key) { cache.delete(key); meta.delete(key); }
    };
};