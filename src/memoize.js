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
 const memo = function(...args) {
        const key = JSON.stringify(args), now = Date.now();
        
        if (cache.has(key)) {
            const m = meta.get(key);
            if (ttl && now - m.t > ttl) {
                cache.delete(key);
                meta.delete(key);
            } else {
                if (strategy === 'LRU') { 
                    const val = cache.get(key);
                    cache.delete(key); 
                    cache.set(key, val); 
                }
                m.f++;
                return cache.get(key);
            }
        }

        if (cache.size >= maxSize) evict();
        const res = fn.apply(this, args);
        cache.set(key, res);
        meta.set(key, { t: now, f: 1 });
        return res;
    };

    memo.getCacheSize = () => cache.size;
    memo.clear = () => { cache.clear(); meta.clear(); };
    
    return memo;
}