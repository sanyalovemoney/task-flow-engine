

import { readFile, stat, unlink } from 'node:fs/promises';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Transform, pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { generateCSVFile } from '../lib/src/generator.js';

const pipelineAsync = promisify(pipeline);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

const C = {
    reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    cyan: '\x1b[36m', white: '\x1b[37m', gray: '\x1b[90m',
    bgBlue: '\x1b[44m', bgRed: '\x1b[41m', bgGreen: '\x1b[42m', bgYellow: '\x1b[43m',
};

const args = process.argv.slice(2);
const getArg = (name) => {
    const a = args.find((x) => x.startsWith(`--${name}=`));
    return a ? a.split('=')[1] : null;
};

const MAX_SIZE_MB = parseInt(getArg('max-size') || '200', 10);

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatDuration(ms) {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}


async function benchmarkReadFile(filePath) {
    global.gc?.();
    const memBefore = process.memoryUsage();
    const start = performance.now();

    let rowCount = 0;
    let totalAmount = 0;
    let peakHeap = memBefore.heapUsed;

    try {
        const data = await readFile(filePath, 'utf-8');

        const memAfterLoad = process.memoryUsage();
        if (memAfterLoad.heapUsed > peakHeap) peakHeap = memAfterLoad.heapUsed;

        const lines = data.split('\n');
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            const parts = line.split(',');
            if (parts.length >= 8) {
                rowCount++;
                totalAmount += parseFloat(parts[7]) || 0;
            }
        }

        const memAfter = process.memoryUsage();
        if (memAfter.heapUsed > peakHeap) peakHeap = memAfter.heapUsed;

        return {
            approach: 'fs.readFile()',
            success: true,
            rowCount,
            totalAmount: totalAmount.toFixed(2),
            peakHeap,
            heapDelta: peakHeap - memBefore.heapUsed,
            durationMs: performance.now() - start,
        };
    } catch (err) {
        return {
            approach: 'fs.readFile()',
            success: false,
            error: err.message.includes('allocation') || err.message.includes('memory')
                ? 'V8 Out of Memory (OOM) crash!'
                : err.message,
            peakHeap,
            heapDelta: peakHeap - memBefore.heapUsed,
            durationMs: performance.now() - start,
        };
    }
}


async function benchmarkStream(filePath) {
    global.gc?.();

    const memBefore = process.memoryUsage();
    const start = performance.now();

    let rowCount = 0;
    let totalAmount = 0;
    let remainder = '';
    let headerSkipped = false;
    let peakHeap = memBefore.heapUsed;

    const processor = new Transform({
        readableObjectMode: false,
        writableObjectMode: false,
        transform(chunk, _enc, cb) {
            const data = remainder + chunk.toString('utf-8');
            const lines = data.split('\n');
            remainder = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                if (!headerSkipped) { headerSkipped = true; continue; }

                const parts = line.split(',');
                if (parts.length >= 8) {
                    rowCount++;
                    totalAmount += parseFloat(parts[7]) || 0;
                }
            }

            if (rowCount % 50_000 === 0) {
                const mem = process.memoryUsage();
                if (mem.heapUsed > peakHeap) peakHeap = mem.heapUsed;
            }

            cb();
        },
        flush(cb) {
            if (remainder.trim()) {
                const parts = remainder.split(',');
                if (parts.length >= 8) {
                    rowCount++;
                    totalAmount += parseFloat(parts[7]) || 0;
                }
            }
            cb();
        }
    });

    const readStream = createReadStream(filePath, { highWaterMark: 64 * 1024 });

    await pipelineAsync(readStream, processor);

    const memAfter = process.memoryUsage();
    if (memAfter.heapUsed > peakHeap) peakHeap = memAfter.heapUsed;

    return {
        approach: 'fs.createReadStream()',
        success: true,
        rowCount,
        totalAmount: totalAmount.toFixed(2),
        peakHeap,
        heapDelta: peakHeap - memBefore.heapUsed,
        durationMs: performance.now() - start,
    };
}
async function main() {
    console.log(`\n${C.bgBlue}${C.bold}${C.white}                                                              ${C.reset}`);
    console.log(`${C.bgBlue}${C.bold}${C.white}       MEMORY BENCHMARK: readFile() vs createReadStream()       ${C.reset}`);
    console.log(`${C.bgBlue}${C.bold}${C.white}                                                              ${C.reset}\n`);

    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

    const testCases = [
        { label: '10 MB', rows: 66_000 },
        { label: '50 MB', rows: 330_000 },
        { label: '100 MB', rows: 660_000 },
        { label: '200 MB', rows: 1_320_000 },
    ].filter((tc) => {
        const approxMB = (tc.rows * 150) / 1_048_576;
        return approxMB <= MAX_SIZE_MB;
    });

    const results = [];

    for (const tc of testCases) {
        const testFile = join(DATA_DIR, `benchmark_${tc.label.replace(' ', '')}.csv`);

        console.log(`${C.bgYellow}${C.bold} ${tc.label} TEST ${C.reset}`);

        console.log(`  ${C.dim}Generating ${tc.label} test file (${tc.rows.toLocaleString()} rows)...${C.reset}`);
        await generateCSVFile(testFile, { totalRows: tc.rows, batchSize: 5_000, seed: 42 });
        const fileInfo = await stat(testFile);
        console.log(`  ${C.green}[OK]${C.reset} File generated: ${formatBytes(fileInfo.size)}\n`);

        console.log(`  ${C.yellow}▸ Testing fs.readFile()...${C.reset}`);
        const readFileResult = await benchmarkReadFile(testFile);
        if (readFileResult.success) {
            console.log(`    ${C.green}[OK]${C.reset} Processed ${readFileResult.rowCount.toLocaleString()} rows in ${formatDuration(readFileResult.durationMs)}`);
            console.log(`    ${C.gray}Peak heap: ${formatBytes(readFileResult.peakHeap)} (Δ ${formatBytes(readFileResult.heapDelta)})${C.reset}`);
        } else {
            console.log(`    ${C.red}[FAILED]: ${readFileResult.error}${C.reset}`);
            console.log(`    ${C.gray}Peak heap before crash: ${formatBytes(readFileResult.peakHeap)}${C.reset}`);
        }

        console.log(`  ${C.cyan}▸ Testing fs.createReadStream()...${C.reset}`);
        const streamResult = await benchmarkStream(testFile);
        console.log(`    ${C.green}[OK]${C.reset} Processed ${streamResult.rowCount.toLocaleString()} rows in ${formatDuration(streamResult.durationMs)}`);
        console.log(`    ${C.gray}Peak heap: ${formatBytes(streamResult.peakHeap)} (Δ ${formatBytes(streamResult.heapDelta)})${C.reset}`);

        if (readFileResult.success) {
            const savings = ((1 - streamResult.heapDelta / readFileResult.heapDelta) * 100).toFixed(1);
            console.log(`    ${C.green}Memory saved by streaming: ${savings}%${C.reset}`);
        }

        results.push({
            size: tc.label,
            fileBytes: fileInfo.size,
            readFile: readFileResult,
            stream: streamResult,
        });


        try { await unlink(testFile); } catch { }

        console.log();
    }

    console.log(`${C.bgGreen}${C.bold}${C.white} BENCHMARK SUMMARY ${C.reset}\n`);

    const headerLine = `  ${'Size'.padEnd(10)}│${'readFile() Heap'.padEnd(18)}│${'Stream Heap'.padEnd(18)}│${'readFile() Time'.padEnd(18)}│${'Stream Time'.padEnd(18)}│${'Memory Saved'.padEnd(14)}`;
    const sep = `  ${'─'.repeat(10)}┼${'─'.repeat(18)}┼${'─'.repeat(18)}┼${'─'.repeat(18)}┼${'─'.repeat(18)}┼${'─'.repeat(14)}`;

    console.log(`  ${'─'.repeat(10)}┬${'─'.repeat(18)}┬${'─'.repeat(18)}┬${'─'.repeat(18)}┬${'─'.repeat(18)}┬${'─'.repeat(14)}`);
    console.log(headerLine);
    console.log(sep);

    for (const r of results) {
        const rfHeap = r.readFile.success ? formatBytes(r.readFile.heapDelta) : `${C.red}OOM${C.reset}`;
        const sHeap = formatBytes(r.stream.heapDelta);
        const rfTime = r.readFile.success ? formatDuration(r.readFile.durationMs) : 'N/A';
        const sTime = formatDuration(r.stream.durationMs);
        const savings = r.readFile.success && r.readFile.heapDelta > 0
            ? `${((1 - r.stream.heapDelta / r.readFile.heapDelta) * 100).toFixed(1)}%`
            : '∞';

        console.log(
            `  ${r.size.padEnd(10)}│` +
            `${(' ' + rfHeap).padEnd(18)}│` +
            `${(' ' + sHeap).padEnd(18)}│` +
            `${(' ' + rfTime).padEnd(18)}│` +
            `${(' ' + sTime).padEnd(18)}│` +
            `${(' ' + savings).padEnd(14)}`
        );
    }
    console.log(`  ${'─'.repeat(10)}┴${'─'.repeat(18)}┴${'─'.repeat(18)}┴${'─'.repeat(18)}┴${'─'.repeat(18)}┴${'─'.repeat(14)}`);

    console.log(`\n  ${C.bold}Key Takeaway:${C.reset}`);
    console.log(`  ${C.cyan}fs.createReadStream()${C.reset} maintains ${C.bold}constant O(1) memory${C.reset} regardless of file size.`);
    console.log(`  ${C.yellow}fs.readFile()${C.reset} loads the ${C.bold}entire file into V8 heap${C.reset}, causing OOM on files > ~1.5 GB.`);
    console.log(`  ${C.dim}The streaming approach uses Node.js built-in backpressure to pause reading${C.reset}`);
    console.log(`  ${C.dim}when the processing pipeline is slower than the I/O subsystem.${C.reset}\n`);
}

main().catch((err) => {
    console.error(`${C.red}Benchmark failed:${C.reset}`, err);
    process.exit(1);
});
