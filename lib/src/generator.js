import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';


export function* fibonacciGenerator() {
    let a = 0n;
    let b = 1n;
    while (true) {
        yield a;
        const temp = a;
        a = b;
        b = temp + b;
    }
}

export async function iteratorWithTimeout(iterator, timeoutSeconds, processor = console.log) {
    return new Promise((resolve) => {
        const timeoutMs = timeoutSeconds * 1000;
        const startTime = Date.now();
        let iteration = 0;

        const consume = () => {
            const elapsed = Date.now() - startTime;

            if (elapsed >= timeoutMs) {
                return resolve();
            }

            const { value, done } = iterator.next();
            if (done) return resolve();

            processor(value, iteration++, elapsed);
            setImmediate(consume);
        };

        consume();
    });
}

const IP_POOL = Array.from({ length: 256 }, (_, i) => String(i));
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const ENDPOINTS = [
    '/api/users', '/api/orders', '/api/products', '/api/payments',
    '/api/auth/login', '/api/auth/logout', '/api/analytics',
    '/api/reports', '/api/settings', '/api/notifications',
];
const STATUS_CODES = [200, 200, 200, 200, 201, 204, 301, 400, 401, 403, 404, 500, 502, 503];

function createRng(seed = 42) {
    let state = seed | 0;
    return function rand() {
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * @param {number}   id   
 * @param {Function} rand 
 * @returns {string} 
 */
function generateRow(id, rand) {
    const ts = new Date(Date.now() - Math.floor(rand() * 30 * 86_400_000)).toISOString();
    const userId = Math.floor(rand() * 100_000) + 1;
    const method = HTTP_METHODS[Math.floor(rand() * HTTP_METHODS.length)];
    const endpoint = ENDPOINTS[Math.floor(rand() * ENDPOINTS.length)];
    const statusCode = STATUS_CODES[Math.floor(rand() * STATUS_CODES.length)];
    const responseTimeMs = Math.floor(rand() * 5000) + 1;

    let amount;
    if (rand() < 0.0005) {
        amount = (1_000_000 + Math.floor(rand() * 9_000_000)).toFixed(2);
    } else {
        amount = (rand() * 10_000).toFixed(2);
    }

    const ip = `${IP_POOL[Math.floor(rand() * 256)]}.${IP_POOL[Math.floor(rand() * 256)]}.${IP_POOL[Math.floor(rand() * 256)]}.${IP_POOL[Math.floor(rand() * 256)]}`;

    return `${id},${ts},${userId},${method},${endpoint},${statusCode},${responseTimeMs},${amount},${ip}\n`;
}

/**
 * @param {object}  opts
 * @param {number}  opts.totalRows 
 * @param {number}  opts.batchSize  
 * @param {number}  opts.seed       
 * @param {Function|null} opts.onProgress 
 */
export async function* generateCSVRows({
    totalRows = 7_000_000,
    batchSize = 5_000,
    seed = 42,
    onProgress = null,
} = {}) {
    const rand = createRng(seed);

    yield 'id,timestamp,userId,method,endpoint,statusCode,responseTimeMs,amount,ipAddress\n';

    let written = 0;

    while (written < totalRows) {
        const end = Math.min(written + batchSize, totalRows);
        let chunk = '';
        for (let i = written; i < end; i++) {
            chunk += generateRow(i + 1, rand);
        }
        written = end;

        if (onProgress) onProgress(written, totalRows);

        yield chunk;
    }
}

/**
 * @param {string} filePath  
 * @param {object} opts      
 * @returns {Promise<{ rows: number, bytes: number, durationMs: number }>}
 */
export async function generateCSVFile(filePath, opts = {}) {
    const start = performance.now();
    let totalBytes = 0;

    const source = Readable.from(generateCSVRows(opts));

    const dest = createWriteStream(filePath, { highWaterMark: 64 * 1024 });
    source.on('data', (chunk) => {
        totalBytes += Buffer.byteLength(chunk, 'utf-8');
    });

    await pipeline(source, dest);

    const durationMs = performance.now() - start;
    return {
        rows: opts.totalRows ?? 7_000_000,
        bytes: totalBytes,
        durationMs,
    };
}
