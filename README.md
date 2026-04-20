# Task-Flow Engine 

An automated task queue processing system developed in Node.js. The project demonstrates the use of modern design patterns, asynchronous programming, and advanced data structures.

## Project Description
This project contains a set of modules (a library) and a separate example demonstrating its usage. 
The following components have been implemented (according to the tasks):
- **Task 1:** Fibonacci Generator (`BigInt`) and a Timeout Iterator with average calculation.
- **Task 2:** Code split into an independent library package (`lib/`) and a demo project (`example/`).
- **Task 3:** Memoization (with LRU, LFU, and TTL cache eviction strategies).
- **Task 4:** Bi-Directional Priority Queue.
- **Task 5:** Asynchronous array functions (Callback, Promise, and AbortController for cancellation).
- **Task 6:** Large data processing using Node.js Streams.
- **Task 7:** Reactive communication using events (`EventEmitter`).
- **Task 8:** Authentication Proxy supporting multiple strategies (API Key, JWT, OAuth2, Basic Auth).
- **Task 9:** Logging Decorator for synchronous and asynchronous functions with conditional logging support.

## Tech Stack
- **Runtime:** Node.js (ES Modules)
- **Language:** JavaScript 
- **Tools:** Git, NPM

## Project Structure 
```text
task-flow-engine/
├── lib/                      ← Library code (Task 2)
│   ├── package.json          
│   └── src/
│       ├── index.js          ← Library exports
│       ├── generator.js      ← Task 1 
│       ├── memoize.js        ← Task 3 
│       ├── queue.js          ← Task 4 
│       ├── async-utils.js    ← Task 5 
│       ├── streams.js        ← Task 6 
│       ├── events.js         ← Task 7 
│       ├── proxy.js          ← Task 8 
│       └── decorators.js     ← Task 9 
├── example/                  ← Demo project (Task 2)
│   ├── index.js              ← Runs all examples
│   └── package.json          ← Contains {"task-flow-engine": "file:../lib"}
└── README.md
```

## How to Run
To run the full demonstration of all features, execute the following commands in the terminal:
```bash
cd example
npm install
node index.js
```

Author: Oleksandr Mashuta 
Group: IM-o51