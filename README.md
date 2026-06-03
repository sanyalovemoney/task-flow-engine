# Task-Flow Engine

A modular Node.js task-flow engine and big data streaming pipeline demonstrating advanced asynchronous programming, event-driven alerts, custom data structures, and memory-efficient ETL processing.

```
[Async Generator] → CSV File (1 GB+)
                         ↓
[fs.createReadStream] → [CSVParserTransform] → [MetricsAggregator] → [AnomalyFilter] → [CleanDataWriter]
                                                                            ↓
                                                                     [EventEmitter]
                                                                            ↓
                                                                 [Terminal Alerts + Telegram Sim]
```

## Overview

This repository contains:
- `lib/`: a reusable library package implementing generators, memoization, queues, async utilities, stream transforms, events, proxy authentication, and decorators.
- `pipeline/`: a streaming ETL pipeline that generates CSV traffic, analyzes metrics, filters anomalies, and writes cleaned output.
- `example/`: a demo project that consumes the local library package and runs example use cases.

## Key Features

- Memory-efficient Node.js streaming pipeline for large CSV workflows
- Partial-line-aware CSV parsing and transform stream processing
- Sliding-window metrics aggregation for request volume, status codes, and top IPs
- Anomaly detection on high request rates, slow response times, and server errors
- Backpressure-safe pipeline using `stream.pipeline()`
- Event-driven alerts with colorized terminal notifications and Telegram payload simulation
- Memoization utilities with LRU, LFU, and TTL eviction strategies
- Bi-directional priority queue implementation
- Asynchronous helpers with callback, promise, and `AbortController` cancellation support
- Authentication proxy supporting API Key, JWT, OAuth2, and Basic Auth strategies
- Logging decorator compatible with sync/async functions and conditional logging

## Installation

From the repository root:

```bash
npm install
```

To run the example demo:

```bash
cd example
npm install
node index.js
```

## Pipeline Usage

Available scripts from the repository root:

```bash
npm run pipeline:small   # Quick pipeline test (~100k rows)
npm run pipeline         # Default pipeline run (~500k rows)
npm run pipeline:medium  # Medium dataset run (~300k rows)
npm run pipeline:large   # Large dataset run (~3M rows)
npm run pipeline:1gb     # Full 1GB+ workload simulation (~7M rows)
npm run benchmark       # Compare readFile() vs createReadStream() memory behavior
```

## Backpressure & Performance

This pipeline is built around `stream.pipeline()` so that downstream slowdowns propagate upstream automatically. That means:

- `CleanDataWriter` backpressure pauses `AnomalyFilter`
- The pause flows back to `fs.createReadStream`
- The event loop remains responsive with non-blocking I/O
- Memory usage stays low even for very large generated datasets

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

## Notes

- The `data/` directory is intended for generated files and is typically gitignored.
- The project is written as an ES module package for modern Node.js usage.

---

Author: Oleksandr Mashuta
Group: IM-o51