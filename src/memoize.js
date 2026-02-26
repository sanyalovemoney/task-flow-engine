export function memoizeById(fn) {
    const cache = new Map();

    return function(...args) {
        const id = (args[0] && typeof args[0] === 'object' && args[0].id) || JSON.stringify(args);

        if (id === undefined) {
            throw new Error("Аргумент повинен бути об'єктом з властивістю 'id' або серіалізованим значенням");
        }
        
        if (cache.has(id)) {
            return cache.get(id);
        }

        const result = fn.apply(this, args);
        cache.set(id, result);
        return result;
    }
}