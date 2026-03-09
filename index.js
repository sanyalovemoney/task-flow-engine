import { taskGenerator, iteratorWithTimeout } from './src/generator.js';
import { memoizeAdvanced } from './src/memoize.js';
import { BiDirectionalPriorityQueue } from './src/queue.js';
import { asyncMapCallback, asyncMapPromise } from './src/async-utils.js';
import { TaskReadableStream, TaskWritableStream } from './src/streams.js';

console.log('TASK-FLOW ENGINE - ALL TASKS DEMO ');
console.log('TASK 1: Generators & Timeout Iterator');
const gen = taskGenerator();
console.log('Generator:', gen.next().value.type);
await iteratorWithTimeout(taskGenerator(), 1, (v, i) => i < 2 && console.log(`     [${i}] ${v.type}`));

console.log('\nTASK 3: Memoization with LRU/LFU/TTL');
const fn = (x) => x * 2;
const lruMemo = memoizeAdvanced(fn, { maxSize: 2, strategy: 'LRU' });
lruMemo(1); lruMemo(2); lruMemo(3);
console.log(`  LRU Cache size: ${lruMemo.getCacheSize()}`);

console.log('\nTASK 4: Bi-Directional Priority Queue');
const queue = new BiDirectionalPriorityQueue();
queue.enqueue('Task A', 10);
queue.enqueue('Task B', 1);
queue.enqueue('Task C', 5);
console.log(`  Highest: ${queue.dequeue('highest')}`);
console.log(`  Lowest: ${queue.dequeue('lowest')}`);
console.log(`  Peek Oldest: ${queue.peek('oldest')}`);

console.log('\nTASK 5: Async Map (Callback & Promise & AbortController)');
const data = [1, 2, 3];
asyncMapCallback(data, (item, cb) => {
  setTimeout(() => cb(item * 2), 10);
}, (results) => console.log(`  Callback results: [${results.join(',')}]`));

const results = await asyncMapPromise(data, async (n) => n * 2);
console.log(`  Promise results: [${results.join(',')}]`);

const controller = new AbortController();
try {
  await asyncMapPromise([1,2,3,4,5], async (n) => {
    await new Promise(r => setTimeout(r, 500));
    return n;
  }, controller.signal);
} catch (error) {
  console.log(`AbortController works`);
}

console.log('\nTASK 6: Stream Processing');
const readable = new TaskReadableStream(taskGenerator(), 2);
const writable = new TaskWritableStream();
readable.pipe(writable);
await new Promise(r => writable.on('finish', r));
console.log(`  Stream processing done `);

console.log('ALL TASKS COMPLETED SUCCESSFULLY');