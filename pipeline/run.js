

import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCSVFile } from '../lib/src/generator.js';
import { runETLPipeline } from '../lib/src/streams.js';
import { createPipelineAlertSystem } from '../lib/src/events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'data');
const INPUT_FILE = join(DATA_DIR, 'transactions.csv');
const OUTPUT_FILE = join(DATA_DIR, 'transactions_clean.csv');

const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    brightCyan: '\x1b[96m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    bgBlue: '\x1b[44m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgRed: '\x1b[41m',
};

const args = process.argv.slice(2);
const getArg = (name) => {
    const arg = args.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.split('=')[1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const TOTAL_ROWS = parseInt(getArg('rows') || '500000', 10);
const SKIP_GENERATE = hasFlag('skip-generate');
const VERBOSE = hasFlag('verbose');

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatDuration(ms) {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
    const minutes = Math.floor(ms / 60_000);
    const seconds = ((ms % 60_000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
}

function printKeyValue(key, value, indent = 2) {
    const pad = ' '.repeat(indent);
    console.log(`${pad}${C.gray}${key}:${C.reset} ${C.bold}${value}${C.reset}`);
}

function printTable(headers, rows) {
    const colWidths = headers.map((h, i) => {
        const maxData = Math.max(...rows.map((r) => String(r[i]).length));
        return Math.max(h.length, maxData) + 2;
    });

    const sep = colWidths.map((w) => '─'.repeat(w)).join('┼');
    const headerLine = headers.map((h, i) => ` ${C.bold}${h}${C.reset}`.padEnd(colWidths[i] + C.bold.length + C.reset.length)).join('│');
    console.log(`  ┌${sep.replace(/┼/g, '┬')}┐`);
    console.log(`  │${headerLine}│`);
    console.log(`  ├${sep}┤`);
    for (const row of rows) {
        const line = row.map((cell, i) => ` ${cell}`.padEnd(colWidths[i])).join('│');
        console.log(`  │${line}│`);
    }
    console.log(`  └${sep.replace(/┼/g, '┴')}┘`);
}

function printSectionHeader(title) {
    console.log(`\n  ${C.bgBlue}${C.bold}${C.white}  ${title} ${C.reset}\n`);
}

async function main() {
    console.log(`\n${C.bgBlue}${C.bold}${C.white}                                                                    ${C.reset}`);
    console.log(`${C.bgBlue}${C.bold}${C.white}     BIG DATA STREAMING PIPELINE — COURSEWORK DEMONSTRATION      ${C.reset}`);
    console.log(`${C.bgBlue}${C.bold}${C.white}                                                                    ${C.reset}`);
    console.log(`${C.gray}   Topic: "Дослідження та розробка системи потокової фільтрації,${C.reset}`);
    console.log(`${C.gray}   трансформації та аналізу великих обсягів структурованих даних${C.reset}`);
    console.log(`${C.gray}   з реактивним сповіщенням"${C.reset}`);
    console.log(`${C.gray}   Author: Oleksandr Mashuta | Group: IM-o51${C.reset}\n`);

    if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
    }



    if (!SKIP_GENERATE || !existsSync(INPUT_FILE)) {
        printSectionHeader('PHASE 1: Data Ingestion — Generating CSV File');

        printKeyValue('Target rows', TOTAL_ROWS.toLocaleString());
        printKeyValue('Output file', INPUT_FILE);
        printKeyValue('Generator', 'Async Generator + stream.pipeline()');
        printKeyValue('Memory model', 'O(1) — batch yield, no full-dataset buffering');
        console.log();

        const memBefore = process.memoryUsage();
        let lastProgress = 0;

        const genResult = await generateCSVFile(INPUT_FILE, {
            totalRows: TOTAL_ROWS,
            batchSize: 5_000,
            seed: 42,
            onProgress: (written, total) => {
                const pct = Math.floor((written / total) * 100);
                if (pct >= lastProgress + 10) {
                    lastProgress = pct;
                    const mem = process.memoryUsage();
                    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
                    process.stdout.write(
                        `\r  ${C.cyan}[${bar}]${C.reset} ${pct}%  ` +
                        `${C.gray}(${written.toLocaleString()} / ${total.toLocaleString()} rows)${C.reset}  ` +
                        `${C.dim}Heap: ${formatBytes(mem.heapUsed)}${C.reset}    `
                    );
                }
            },
        });

        process.stdout.write('\r' + ' '.repeat(120) + '\r');
        const memAfter = process.memoryUsage();

        console.log(`  ${C.green} Generation complete!${C.reset}\n`);
        printKeyValue('Rows generated', genResult.rows.toLocaleString());
        printKeyValue('File size', formatBytes(genResult.bytes));
        printKeyValue('Duration', formatDuration(genResult.durationMs));
        printKeyValue('Throughput', `${((genResult.rows / genResult.durationMs) * 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} rows/sec`);
        printKeyValue('Heap before', formatBytes(memBefore.heapUsed));
        printKeyValue('Heap after', formatBytes(memAfter.heapUsed));
        printKeyValue('Heap delta', formatBytes(Math.abs(memAfter.heapUsed - memBefore.heapUsed)));
    } else {
        printSectionHeader('PHASE 1: Skipped (--skip-generate)',);
        const stat = statSync(INPUT_FILE);
        printKeyValue('Using existing file', INPUT_FILE);
        printKeyValue('File size', formatBytes(stat.size));
    }


    printSectionHeader('PHASE 2: ETL Pipeline — Streaming Analysis');

    console.log(`  ${C.dim}Pipeline architecture:${C.reset}`);
    console.log(`  ${C.cyan}[fs.ReadStream]${C.reset} → ${C.yellow}[CSVParser]${C.reset} → ${C.green}[MetricsAggregator]${C.reset} → ${C.red}[AnomalyFilter]${C.reset} → ${C.blue}[CleanWriter]${C.reset}`);
    console.log(`  ${C.dim}                                                      ↓${C.reset}`);
    console.log(`  ${C.dim}                                               [EventEmitter → Alerts]${C.reset}\n`);

    const alertSystem = createPipelineAlertSystem({
        enableTerminalAlerts: true,
        enableTelegramSim: true,
        verbose: VERBOSE,
        maxTerminalAlerts: 25,
    });

    console.log(`  ${C.gray}Processing... (alerts will appear below)${C.reset}\n`);

    const memBeforeETL = process.memoryUsage();

    let lastReported = 0;
    const etlResult = await runETLPipeline({
        inputPath: INPUT_FILE,
        outputPath: OUTPUT_FILE,
        alertEmitter: alertSystem.emitter,
        onProgress: (parsedRows) => {
            if (parsedRows - lastReported >= 100_000) {
                lastReported = parsedRows;
                const mem = process.memoryUsage();
                process.stdout.write(
                    `\r  ${C.dim}Processed: ${parsedRows.toLocaleString()} rows | Heap: ${formatBytes(mem.heapUsed)}${C.reset}    `
                );
            }
        },
    });

    process.stdout.write('\r' + ' '.repeat(100) + '\r');

    const memAfterETL = process.memoryUsage();

    console.log(`\n  ${C.green}ETL Pipeline complete!${C.reset}\n`);


    printSectionHeader('PHASE 3: Pipeline Results & Analytics',);

    console.log(`  ${C.bold}${C.cyan}Pipeline Performance${C.reset}`);
    printKeyValue('Total rows parsed', etlResult.parsedRows.toLocaleString());
    printKeyValue('Clean rows written', etlResult.cleanCount.toLocaleString());
    printKeyValue('Anomalies detected', `${C.red}${etlResult.anomalyCount.toLocaleString()}${C.reset}`);
    printKeyValue('Duration', formatDuration(etlResult.durationMs));
    printKeyValue('Throughput', `${((etlResult.parsedRows / etlResult.durationMs) * 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} rows/sec`);
    printKeyValue('Heap before ETL', formatBytes(memBeforeETL.heapUsed));
    printKeyValue('Heap after ETL', formatBytes(memAfterETL.heapUsed));
    printKeyValue('Output file', OUTPUT_FILE);

    if (existsSync(OUTPUT_FILE)) {
        printKeyValue('Output size', formatBytes(statSync(OUTPUT_FILE).size));
    }

    const m = etlResult.metrics;
    console.log(`\n  ${C.bold}${C.cyan}Transaction Metrics${C.reset}`);
    printKeyValue('Total amount', `$${Number(m.totalAmount).toLocaleString()}`);
    printKeyValue('Average amount', `$${m.avgAmount}`);
    printKeyValue('Min amount', `$${m.minAmount}`);
    printKeyValue('Max amount', `$${m.maxAmount}`);
    printKeyValue('Error rate (4xx+5xx)', m.errorRate);
    printKeyValue('Avg response time', `${m.avgResponseTimeMs}ms`);

    console.log(`\n  ${C.bold}${C.cyan}HTTP Status Code Distribution${C.reset}`);
    const statusRows = Object.entries(m.statusCodes)
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => {
            const pct = ((count / etlResult.parsedRows) * 100).toFixed(1);
            return [code, count.toLocaleString(), `${pct}%`];
        });
    printTable(['Status', 'Count', '%'], statusRows);

    console.log(`\n  ${C.bold}${C.cyan}HTTP Method Distribution${C.reset}`);
    const methodRows = Object.entries(m.methodCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([method, count]) => {
            const pct = ((count / etlResult.parsedRows) * 100).toFixed(1);
            return [method, count.toLocaleString(), `${pct}%`];
        });
    printTable(['Method', 'Count', '%'], methodRows);

    console.log(`\n  ${C.bold}${C.cyan}Top 10 IP Addresses by Request Count${C.reset}`);
    const ipRows = Object.entries(m.topIPs).map(([ip, count]) => [
        ip, count.toLocaleString(),
    ]);
    printTable(['IP Address', 'Requests'], ipRows);

    console.log(`\n  ${C.bold}${C.cyan}Top 5 Busiest Minutes (by transaction volume)${C.reset}`);
    const minuteRows = Object.entries(m.busiestMinutes).map(([minute, vol]) => [
        minute, `$${Number(vol).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    ]);
    printTable(['Minute Window', 'Total Volume'], minuteRows);

    const alertSummary = alertSystem.getSummary();
    console.log(`\n  ${C.bold}${C.cyan}Reactive Alert System Summary${C.reset}`);
    printKeyValue('Total anomalies', alertSummary.totalAnomalies.toLocaleString());
    printKeyValue('CRITICAL', `${C.red}${alertSummary.severityBreakdown.CRITICAL}${C.reset}`);
    printKeyValue('HIGH', `${C.red}${alertSummary.severityBreakdown.HIGH}${C.reset}`);
    printKeyValue('MEDIUM', `${C.yellow}${alertSummary.severityBreakdown.MEDIUM}${C.reset}`);
    printKeyValue('LOW', `${C.cyan}${alertSummary.severityBreakdown.LOW}${C.reset}`);
    printKeyValue('Alerts shown in terminal', alertSummary.terminalAlertsShown.toString());
    printKeyValue('Alerts suppressed (rate-limited)', alertSummary.alertsSuppressed.toString());

    if (alertSummary.topOffenders.length > 0) {
        console.log(`\n  ${C.bold}${C.cyan}Top Offending IPs (by anomaly count)${C.reset}`);
        const offenderRows = alertSummary.topOffenders.map((o) => [
            o.ip, o.anomalyCount.toString(),
        ]);
        printTable(['IP Address', 'Anomalies'], offenderRows);
    }

    printSectionHeader('MEMORY EFFICIENCY ANALYSIS');
    console.log(`  ${C.bold}Streaming approach (this pipeline):${C.reset}`);
    printKeyValue('Peak heap (approx)', formatBytes(memAfterETL.heapUsed));
    printKeyValue('RSS', formatBytes(memAfterETL.rss));
    printKeyValue('Memory model', 'O(1) — constant regardless of file size');
    console.log();
    console.log(`  ${C.bold}Traditional fs.readFile() approach (theoretical):${C.reset}`);
    const inputSize = existsSync(INPUT_FILE) ? statSync(INPUT_FILE).size : TOTAL_ROWS * 150;
    printKeyValue('File loaded into RAM', formatBytes(inputSize));
    printKeyValue('V8 heap limit (default)', '~1.7 GB');
    printKeyValue('Expected result', inputSize > 1_500_000_000
        ? `${C.red}FATAL — V8 Out of Memory crash${C.reset}`
        : `${C.yellow}HIGH RISK — ${((inputSize / 1_700_000_000) * 100).toFixed(0)}% of V8 heap limit${C.reset}`
    );
    console.log(`\n  ${C.dim}Run "node pipeline/benchmark.js" for a live comparative experiment.${C.reset}`);

    console.log(`\n${C.bgGreen}${C.bold}${C.white}                                                          ${C.reset}`);
    console.log(`${C.bgGreen}${C.bold}${C.white}     ALL PIPELINE PHASES COMPLETED SUCCESSFULLY        ${C.reset}`);
    console.log(`${C.bgGreen}${C.bold}${C.white}                                                          ${C.reset}\n`);
}

main().catch((err) => {
    console.error(`\n${C.bgRed}${C.bold} FATAL ERROR ${C.reset}`, err);
    process.exit(1);
});
