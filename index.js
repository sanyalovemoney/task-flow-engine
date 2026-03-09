import { taskGenerator, iteratorWithTimeout } from './src/generator.js';
import { memoizeAdvanced } from './src/memoize.js';
import { BiDirectionalPriorityQueue } from './src/queue.js';

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

console.log('ALL TASKS COMPLETED SUCCESSFULLY');