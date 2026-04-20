export class BiDirectionalPriorityQueue {
  constructor() {
    this.items = [];
    this.counter = 0;
  }
  enqueue(item, priority) {
    const entry = { item, priority, order: this.counter++ };

    let i = 0;
    while (i < this.items.length && this.items[i].priority >= entry.priority) {
      i++;
    }
    this.items.splice(i, 0, entry);
    console.log(`[Queue] Added: ${item}, priority: ${priority}`);
  }

  dequeue(type) {
    if (this.items.length === 0) return null;

    switch (type) {
      case 'highest': return this.items.shift().item;
      case 'lowest': return this.items.pop().item;
      default: return this._dequeueByOrder(type);
    }
  }

  peek(type) {
    if (this.items.length === 0) return null;

    switch (type) {
      case 'highest': return this.items[0].item;
      case 'lowest': return this.items[this.items.length - 1].item;
      default: return this._peekByOrder(type);
    }
  }

  _findOrderIndex(type) {
    if (this.items.length === 0) return -1;
    return this.items.reduce((bestIdx, curr, currIdx, arr) => {
      const best = arr[bestIdx];
      return type === 'oldest'
        ? (curr.order < best.order ? currIdx : bestIdx)
        : (curr.order > best.order ? currIdx : bestIdx);
    }, 0);
  }

  _dequeueByOrder(type) {
    const idx = this._findOrderIndex(type);
    if (idx === -1) return null;
    return this.items.splice(idx, 1)[0].item;
  }

  _peekByOrder(type) {
    const idx = this._findOrderIndex(type);
    if (idx === -1) return null;
    return this.items[idx].item;
  }

  get size() { return this.items.length; }
}
