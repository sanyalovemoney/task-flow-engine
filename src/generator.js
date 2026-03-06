export function* taskGenerator() {
    const taskTypes = ['DataSync', 'ReportGen', 'EmailPush', 'CacheClear'];
    while (true) {
        yield {
            id: Math.floor(Math.random() * 1000),
            type: taskTypes[Math.floor(Math.random() * taskTypes.length)],
            timestamp: new Date().toISOString()
        };
    }
}

export async function iteratorWithTimeout(iterator, timeoutSeconds, processor = console.log) {
    return new Promise((resolve) => {
        const results = [];
        const timeoutMs = timeoutSeconds * 1000;
        const startTime = Date.now();
        let iteration = 0;

        const consume = () => {
            const elapsed = Date.now() - startTime;

            if (elapsed >= timeoutMs) {
                return resolve(results);
            }

            const { value, done } = iterator.next();
            if (done) return resolve(results);

            results.push(value);
            processor(value, iteration++, elapsed);
            setImmediate(consume);
        };

        consume();
    });
}