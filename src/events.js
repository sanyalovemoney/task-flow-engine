import { EventEmitter } from 'events';  

export function createEventEmitter(target) {
    const ee = new EventEmitter();

    const originalEnqueue = target.enqueue.bind(target);
    const originalDequeue = target.dequeue.bind(target);

    target.enqueue = (item, priority) => {
        originalEnqueue(item, priority);
        ee.emit('added', { item, priority });
    };

    target.dequeue = (type) => {
        const item = originalDequeue(type);
        if (item) {
            ee.emit('dequeued', { item, type });
        } else {
            ee.emit('empty');
        }
        return item;
    };

    return ee;
}