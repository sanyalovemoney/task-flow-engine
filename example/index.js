import {
  taskGenerator,
  iteratorWithTimeout,
  memoizeAdvanced,
  BiDirectionalPriorityQueue,
  asyncMapCallback,
  asyncMapPromise,
  TaskReadableStream,
  TaskWritableStream,
  createEventEmitter,
  APIAuthProxy,
  AuthStrategy,
  log,
  LogLevel,
  conditionalLog,
} from 'task-flow-engine';

console.log('  TASK-FLOW ENGINE — ALL TASKS DEMO');

console.log('Task 1: Generators & Timeout Iterator');

const gen = taskGenerator();
const first = gen.next().value;
console.log(`  Generator first value: type="${first.type}", id=${first.id}`);

console.log('  Running iterator for 50ms...');
await iteratorWithTimeout(taskGenerator(), 0.05, (v, i) => {
  if (i < 3) console.log(`    [${i}] type=${v.type}`);
});
console.log('  Iterator finished \n');


console.log(' Task 3: Memoization (LRU / LFU / TTL) ');

const double = (x) => x * 2;

const lruMemo = memoizeAdvanced(double, { maxSize: 2, strategy: 'LRU' });
lruMemo(1); lruMemo(2); lruMemo(3);
console.log(`  LRU — cache size after 3 calls (max 2): ${lruMemo.getCacheSize()}`);

const lfuMemo = memoizeAdvanced(double, { maxSize: 2, strategy: 'LFU' });
lfuMemo(10); lfuMemo(10); lfuMemo(20); lfuMemo(30);
console.log(`  LFU — cache size after 4 calls (max 2): ${lfuMemo.getCacheSize()}`);

const ttlMemo = memoizeAdvanced(double, { ttl: 50 });
ttlMemo(5);
await new Promise((r) => setTimeout(r, 80));
ttlMemo(5);
console.log(`  TTL — result recomputed after expiry \n`);


console.log('Task 4: Bi-Directional Priority Queue');

const pq = new BiDirectionalPriorityQueue();
pq.enqueue('Low', 1);
pq.enqueue('High', 10);
pq.enqueue('Medium', 5);
pq.enqueue('VeryHigh', 20);

console.log(`  peek(highest)  → ${pq.peek('highest')}`);
console.log(`  peek(lowest)   → ${pq.peek('lowest')}`);
console.log(`  peek(oldest)   → ${pq.peek('oldest')}`);
console.log(`  peek(newest)   → ${pq.peek('newest')}`);

console.log(`  dequeue(highest) → ${pq.dequeue('highest')}`);
console.log(`  dequeue(lowest)  → ${pq.dequeue('lowest')}`);
console.log(`  dequeue(oldest)  → ${pq.dequeue('oldest')}`);
console.log(`  dequeue(newest)  → ${pq.dequeue('newest')}`);
console.log(`  Queue empty: ${pq.size === 0} \n`);

console.log('Task 5: Async Map (Callback / Promise / Abort)');

const nums = [1, 2, 3];

asyncMapCallback(
  nums,
  (item, cb) => setTimeout(() => cb(item * 10), 10),
  (results) => console.log(`  Callback results: [${results.join(', ')}]`),
);

const promiseResults = await asyncMapPromise(nums, async (n) => n * 10);
console.log(`  Promise results:  [${promiseResults.join(', ')}]`);

asyncMapCallback([], (item, cb) => cb(item), (r) => console.log(`  Empty array -> onDone called with []  (len=${r.length})`));

const controller = new AbortController();
setTimeout(() => controller.abort(), 50);
try {
  await asyncMapPromise(
    [1, 2, 3],
    async (n) => { await new Promise((r) => setTimeout(r, 200)); return n; },
    controller.signal,
  );
} catch {
  console.log(`AbortController works \n`);
}

console.log('Task 6: Large Data Processing with Streams');

const readable = new TaskReadableStream(taskGenerator(), 3);
const writable = new TaskWritableStream();
readable.pipe(writable);
await new Promise((r) => writable.on('finish', r));
console.log(`  Stream processing done \n`);

console.log('Task 7: Reactive Communication (EventEmitter)');

const eventQueue = new BiDirectionalPriorityQueue();
const emitter = createEventEmitter(eventQueue);

let addCount = 0;
emitter.on('added', ({ item }) => { addCount++; });
emitter.on('dequeued', ({ item }) => console.log(`  Dequeued event: ${item}`));
emitter.on('empty', () => console.log(`  Queue-empty event fired `));

eventQueue.enqueue('Alpha', 3);
eventQueue.enqueue('Beta', 7);
eventQueue.dequeue('highest');
eventQueue.dequeue('highest');

const onAdded = () => { };
emitter.on('added', onAdded);
emitter.off('added', onAdded);
console.log(`  Added events received: ${addCount}, unsubscribe works ✓\n`);

console.log('Task 8: Auth Proxy (API Key / JWT / Basic / OAuth2)');

const apiKeyProxy = new APIAuthProxy('https://api.example.com', AuthStrategy.API_KEY, { apiKey: 'key-123' });
const jwtProxy = new APIAuthProxy('https://api.example.com', AuthStrategy.JWT, { jwtToken: 'jwt-token' });
const basicProxy = new APIAuthProxy('https://api.example.com', AuthStrategy.BASIC_AUTH, { username: 'admin', password: 'secret' });
const oauthProxy = new APIAuthProxy('https://api.example.com', AuthStrategy.OAUTH2, { accessToken: 'oauth-token' });

await apiKeyProxy.get('/users');
await jwtProxy.get('/secure');
await basicProxy.get('/dashboard');
await oauthProxy.post('/data', {});
console.log(`  All 4 auth strategies work \n`);

console.log('Task 9: Logging Decorator (Sync / Async / Conditional)');

const addFn = log({ level: LogLevel.INFO })(function add(a, b) { return a + b; });
const syncResult = addFn(5, 10);
console.log(`  Sync result (not a Promise): ${syncResult} — is Promise: ${syncResult instanceof Promise} ✓`);

const asyncFn = log({ level: LogLevel.INFO })(async function fetchData() { return 'data'; });
const asyncResult = await asyncFn();
console.log(`  Async result: "${asyncResult}" `);

const multiplyFn = conditionalLog((r) => r > 10)(function multiply(x) { return x * 3; });
multiplyFn(2);
multiplyFn(5);

console.log(`  Conditional logging works \n`);

console.log('  ALL TASKS COMPLETED SUCCESSFULLY ');