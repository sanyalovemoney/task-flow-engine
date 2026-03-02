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

  _getIndex(type) {
    if (this.items.length === 0) return -1;

    return this.items.reduce((bestIdx, curr, currIdx, arr) => {
      const best = arr[bestIdx];
      switch (type) {
        case 'highest': return curr.priority < best.priority ? currIdx : bestIdx;
        case 'lowest':  return curr.priority > best.priority ? currIdx : bestIdx;
        case 'oldest':  return curr.order < best.order ? currIdx : bestIdx;
        case 'newest':  return curr.order > best.order ? currIdx : bestIdx;
        default: return bestIdx;
      }
    }, 0);
  }

dequeue(type) { 
    const index = this._getIndex(type);
    if (index === -1) return null;
    return this.items.splice(index, 1)[0].item;
  }
  
peek(type) {
    const index = this._getIndex(type);
    if (index === -1) return null;
    return this.items[index].item;
  }
}