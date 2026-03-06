import { taskGenerator, iteratorWithTimeout } from './src/generator.js';

console.log('TASK-FLOW ENGINE - ALL TASKS DEMO ');
console.log('TASK 1: Generators & Timeout Iterator');
const gen = taskGenerator();
console.log('Generator:', gen.next().value.type);
await iteratorWithTimeout(taskGenerator(), 1, (v, i) => i < 2 && console.log(`     [${i}] ${v.type}`));

console.log('ALL TASKS COMPLETED SUCCESSFULLY');