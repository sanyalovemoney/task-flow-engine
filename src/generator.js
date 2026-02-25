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