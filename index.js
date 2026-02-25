import { taskGenerator } from './src/generator.js';

const gen = taskGenerator();

console.log("--- Запуск генератора задач ---");

for (let i = 0; i < 3; i++) {
    console.log("Згенерована задача:", gen.next().value);
}