export class BiDirectionalPriorityQueue {
  constructor() {
    this.items = [];
    this.counter = 0; 
  }

enqueue(item, priority) {
    this.items.push({
      item,
      priority,
      order: this.counter++ 
    });
    console.log(`[Queue] Додано: ${item}, пріоритет: ${priority}`);
  }
}