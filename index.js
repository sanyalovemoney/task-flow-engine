import { taskGenerator } from './src/generator.js';
import { memoizeById } from './src/memoize.js';
import { logExecution } from './src/decorators.js';
import { BiDirectionalPriorityQueue } from './src/queue.js';
import { asyncMapPromise } from './src/async-utils.js';

const gen = taskGenerator();

console.log("Запуск генератора задач");

for (let i = 0; i < 3; i++) {
    console.log("Згенерована задача:", gen.next().value);
}

function smartProcessTask(task) {
    return `Processed: ${task.type} (ID: ${task.id})`;
}

const wrappedSmartProcessTask = logExecution(memoizeById(smartProcessTask));
const gen1 = taskGenerator();
const task1 = gen1.next().value;
const task2 = gen1.next().value;

console.log("Обробка задачі 1:");
wrappedSmartProcessTask(task1);
console.log("Повторна обробка задачі 1:");
wrappedSmartProcessTask(task1);
console.log("Обробка задачі 2:");
wrappedSmartProcessTask(task2);

const bpq = new BiDirectionalPriorityQueue();
bpq.enqueue("Task A", 10); 
bpq.enqueue("Task B", 1);  
bpq.enqueue("Task C", 5);  

console.log("Highest:", bpq.dequeue('highest')); 
console.log("Oldest:", bpq.dequeue('oldest'));  

const controller = new AbortController();
const data = [1, 2, 3, 4, 5];

const slowSquare = async (n) => {
  await new Promise(res => setTimeout(res, 1000));
  return n * n;
};

console.log("Починаємо асинхронний map");

try {
  setTimeout(() => controller.abort(), 1500);

  const results = await asyncMapPromise(data, slowSquare, controller.signal);
  console.log("Результати:", results);
} catch (err) {
  console.log("Помилка:", err.message); 
}