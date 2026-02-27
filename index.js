import { taskGenerator } from './src/generator.js';
import { memoizeById } from './src/memoize.js';
import { logExecution } from './src/decorators.js';

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