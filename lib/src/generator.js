export function* fibonacciGenerator() {
    let a = 0n;
    let b = 1n;
    while (true) {
        yield a;
        const temp = a;
        a = b;
        b = temp + b;
    }
}

export async function iteratorWithTimeout(iterator, timeoutSeconds, processor = console.log) {
    return new Promise((resolve) => {
        const timeoutMs = timeoutSeconds * 1000;
        const startTime = Date.now();
        let iteration = 0;

        const consume = () => {
            const elapsed = Date.now() - startTime;

            if (elapsed >= timeoutMs) {
                return resolve();
            }

            const { value, done } = iterator.next();
            if (done) return resolve();

            processor(value, iteration++, elapsed);
            setImmediate(consume);
        };

        consume();
    });
}
