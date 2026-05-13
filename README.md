# Task-Flow Engine

An automated task queue processing system developed in Node.js. The project demonstrates the use of modern design patterns, asynchronous programming, and advanced data structures.

## Coursework: Big Data Streaming Pipeline

**Topic:** *"Дослідження та розробка системи потокової фільтрації, трансформації та аналізу великих обсягів структурованих даних з реактивним сповіщенням"*

The coursework extends the core library with a production-grade **ETL streaming pipeline** that processes gigabyte-scale CSV files with constant O(1) memory usage.

### Pipeline Architecture
```
[Async Generator] → CSV File (1 GB+)
                         ↓
[fs.createReadStream] → [CSVParserTransform] → [MetricsAggregator] → [AnomalyFilter] → [CleanDataWriter]
                                                                            ↓
                                                                     [EventEmitter]
                                                                            ↓
                                                                 [Terminal Alerts + Telegram Sim]
```

### Key Components
| Module | File | Description |
|---|---|---|
| Data Ingestion | `lib/src/generator.js` | Async generator producing CSV rows with Mulberry32 PRNG |
| CSV Parser | `lib/src/streams.js` | Transform stream with partial-line buffering |
| Metrics Aggregator | `lib/src/streams.js` | Sliding-window per-minute volume, status codes, top IPs |
| Anomaly Filter | `lib/src/streams.js` | Detects high amounts, slow responses, server errors |
| Alert System | `lib/src/events.js` | Color-coded terminal alerts, Telegram payload simulation |
| Pipeline Runner | `pipeline/run.js` | Orchestrates all phases with progress reporting |
| Memory Benchmark | `pipeline/benchmark.js` | Comparative `readFile()` vs `createReadStream()` analysis |

### How to Run the Pipeline
```bash
# Quick test (~14 MB, 100K rows)
npm run pipeline:small

# Default (~70 MB, 500K rows)
npm run pipeline

# Medium (~45 MB, 300K rows to ~430 MB, 3M rows)
npm run pipeline:medium
npm run pipeline:large

# Full 1 GB+ benchmark
npm run pipeline:1gb

# Memory benchmark (readFile vs streams)
npm run benchmark
```

### Backpressure & Event Loop Behavior
The pipeline uses `stream.pipeline()` which automatically manages backpressure:
- When the downstream `CleanDataWriter` cannot flush to disk fast enough, it signals the upstream `AnomalyFilter` to pause.
- This pause propagates all the way back to `fs.createReadStream`, which stops reading from the OS file descriptor.
- The event loop remains responsive throughout — no blocking I/O.
- Memory stays at ~30-50 MB regardless of whether the input file is 10 MB or 10 GB.

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
- **Core APIs:** `node:stream`, `node:events`, `node:fs`

## Project Structure 
```text
task-flow-engine/
├── lib/                      ← Library code (Task 2)
│   ├── package.json          
│   └── src/
│       ├── index.js          ← Library exports
│       ├── generator.js      ← Task 1 + CSV Data Ingestion
│       ├── memoize.js        ← Task 3 
│       ├── queue.js          ← Task 4 
│       ├── async-utils.js    ← Task 5 
│       ├── streams.js        ← Task 6 + ETL Pipeline Transforms
│       ├── events.js         ← Task 7 + Reactive Alert System
│       ├── proxy.js          ← Task 8 
│       └── decorators.js     ← Task 9 
├── pipeline/                 ← Big Data Pipeline (Coursework)
│   ├── run.js                ← Main pipeline orchestrator
│   └── benchmark.js          ← Memory comparison experiment
├── example/                  ← Demo project (Task 2)
│   ├── index.js              ← Runs all examples
│   └── package.json          ← Contains {"task-flow-engine": "file:../lib"}
├── data/                     ← Generated CSV files (gitignored)
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