import { Readable, } from 'stream';

export class TaskReadableStream extends Readable { 
  constructor(generator, limit = 10) {
    super({ objectMode: true });
    this.generator = generator;
    this.limit = limit;
    this.count = 0;
  }

  _read() {
    if (this.count >= this.limit) {
      this.push(null); 
      return;
    }
    const { value } = this.generator.next();
    this.push(value);
    this.count++;
  }
}