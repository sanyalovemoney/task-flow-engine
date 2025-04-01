
import { Readable, Writable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { EventEmitter } from 'node:events';



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

export class TaskWritableStream extends Writable {
    constructor() {
        super({ objectMode: true });
    }

    _write(chunk, _encoding, callback) {
        console.log(`[Stream] Recorded: Fibonacci values = ${chunk}`);
        callback();
    }
}

const CSV_FIELDS = [
    'id', 'timestamp', 'userId', 'method', 'endpoint',
    'statusCode', 'responseTimeMs', 'amount', 'ipAddress',
];


export class CSVParserTransform extends Transform {
    constructor() {
        super({
            readableObjectMode: true,
            writableObjectMode: false,
            highWaterMark: 16,
        });
        this._remainder = '';
        this._headerSkipped = false;
        this.parsedCount = 0;
    }

    _transform(chunk, _encoding, callback) {
        const data = this._remainder + chunk.toString('utf-8');
        const lines = data.split('\n');


        this._remainder = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) continue;


            if (!this._headerSkipped) {
                this._headerSkipped = true;
                continue;
            }

            const parts = line.split(',');
            if (parts.length < CSV_FIELDS.length) continue;

            const record = {};
            for (let i = 0; i < CSV_FIELDS.length; i++) {
                record[CSV_FIELDS[i]] = parts[i];
            }

            record.id = Number(record.id);
            record.userId = Number(record.userId);
            record.statusCode = Number(record.statusCode);
            record.responseTimeMs = Number(record.responseTimeMs);
            record.amount = parseFloat(record.amount);

            this.parsedCount++;
            this.push(record);
        }

        callback();
    }

    _flush(callback) {

        if (this._remainder.trim()) {
            const parts = this._remainder.split(',');
            if (parts.length >= CSV_FIELDS.length) {
                const record = {};
                for (let i = 0; i < CSV_FIELDS.length; i++) {
                    record[CSV_FIELDS[i]] = parts[i];
                }
                record.id = Number(record.id);
                record.userId = Number(record.userId);
                record.statusCode = Number(record.statusCode);
                record.responseTimeMs = Number(record.responseTimeMs);
                record.amount = parseFloat(record.amount);
                this.parsedCount++;
                this.push(record);
            }
        }
        callback();
    }
}


export class MetricsAggregator extends Transform {
    constructor() {
        super({ objectMode: true, highWaterMark: 16 });

        this.metrics = {
            totalRows: 0,
            totalAmount: 0,
            minAmount: Infinity,
            maxAmount: -Infinity,
            totalResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: -Infinity,
            statusCodes: {},
            methodCounts: {},
            volumePerMinute: {},
            topIPs: {},
            anomalyCount: 0,
            errorCount: 0,
        };
    }

    _transform(record, _encoding, callback) {
        const m = this.metrics;
        m.totalRows++;


        m.totalAmount += record.amount;
        if (record.amount < m.minAmount) m.minAmount = record.amount;
        if (record.amount > m.maxAmount) m.maxAmount = record.amount;

        m.totalResponseTime += record.responseTimeMs;
        if (record.responseTimeMs < m.minResponseTime) m.minResponseTime = record.responseTimeMs;
        if (record.responseTimeMs > m.maxResponseTime) m.maxResponseTime = record.responseTimeMs;

        m.statusCodes[record.statusCode] = (m.statusCodes[record.statusCode] || 0) + 1;
        if (record.statusCode >= 400) m.errorCount++;

        m.methodCounts[record.method] = (m.methodCounts[record.method] || 0) + 1;

        const minuteKey = record.timestamp.slice(0, 16);
        m.volumePerMinute[minuteKey] = (m.volumePerMinute[minuteKey] || 0) + record.amount;

        m.topIPs[record.ipAddress] = (m.topIPs[record.ipAddress] || 0) + 1;

        this.push(record);
        callback();
    }

    getReport() {
        const m = this.metrics;
        const avgAmount = m.totalRows > 0 ? m.totalAmount / m.totalRows : 0;
        const avgResponseTime = m.totalRows > 0 ? m.totalResponseTime / m.totalRows : 0;

        const sortedIPs = Object.entries(m.topIPs)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const topMinutes = Object.entries(m.volumePerMinute)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            totalRows: m.totalRows,
            totalAmount: m.totalAmount.toFixed(2),
            avgAmount: avgAmount.toFixed(2),
            minAmount: m.minAmount.toFixed(2),
            maxAmount: m.maxAmount.toFixed(2),
            avgResponseTimeMs: avgResponseTime.toFixed(1),
            minResponseTimeMs: m.minResponseTime,
            maxResponseTimeMs: m.maxResponseTime,
            statusCodes: m.statusCodes,
            methodCounts: m.methodCounts,
            errorRate: m.totalRows > 0 ? ((m.errorCount / m.totalRows) * 100).toFixed(2) + '%' : '0%',
            anomalyCount: m.anomalyCount,
            topIPs: Object.fromEntries(sortedIPs),
            busiestMinutes: Object.fromEntries(topMinutes),
        };
    }
}

const ANOMALY_AMOUNT_THRESHOLD = 1_000_000;
const ANOMALY_RESPONSE_TIME_THRESHOLD = 4500;

export class AnomalyFilter extends Transform {
    /**
     * @param { EventEmitter } alertEmitter
     * @param { MetricsAggregator } metricsRef
     */
    constructor(alertEmitter, metricsRef = null) {
        super({ objectMode: true, highWaterMark: 16 });
        this.alertEmitter = alertEmitter;
        this.metricsRef = metricsRef;
        this.anomalyCount = 0;
        this.cleanCount = 0;
    }

    _transform(record, _encoding, callback) {
        const anomalies = [];

        if (record.amount > ANOMALY_AMOUNT_THRESHOLD) {
            anomalies.push(`HIGH_AMOUNT: $${record.amount.toLocaleString()}`);
        }

        if (record.responseTimeMs > ANOMALY_RESPONSE_TIME_THRESHOLD) {
            anomalies.push(`SLOW_RESPONSE: ${record.responseTimeMs}ms`);
        }

        if (record.statusCode >= 500) {
            anomalies.push(`SERVER_ERROR: HTTP ${record.statusCode}`);
        }

        if (anomalies.length > 0) {
            this.anomalyCount++;
            if (this.metricsRef) this.metricsRef.metrics.anomalyCount++;

            record._anomaly = true;
            record._anomalyReasons = anomalies;


            this.alertEmitter.emit('anomaly', {
                id: record.id,
                timestamp: record.timestamp,
                userId: record.userId,
                ipAddress: record.ipAddress,
                amount: record.amount,
                statusCode: record.statusCode,
                responseTimeMs: record.responseTimeMs,
                reasons: anomalies,
                detectedAt: new Date().toISOString(),
            });
        } else {
            this.cleanCount++;
        }

        this.push(record);
        callback();
    }
}

export class CleanDataWriter extends Writable {
    /**
     * @param {import('node:fs').WriteStream} fileStream 
     */
    constructor(fileStream) {
        super({ objectMode: true, highWaterMark: 16 });
        this._file = fileStream;
        this._headerWritten = false;
        this.writtenCount = 0;
    }

    _write(record, _encoding, callback) {
        if (!this._headerWritten) {
            this._file.write(CSV_FIELDS.join(',') + '\n');
            this._headerWritten = true;
        }

        if (record._anomaly) {
            callback();
            return;
        }

        const line = CSV_FIELDS.map((f) => record[f]).join(',') + '\n';
        this.writtenCount++;

        if (!this._file.write(line)) {
            this._file.once('drain', callback);
        } else {
            callback();
        }
    }

    _final(callback) {
        this._file.end(callback);
    }
}
/**
 * @param {object}       opts
 * @param {string}       opts.inputPath      
 * @param {string}       opts.outputPath     
 * @param {EventEmitter} opts.alertEmitter  
 * @param {Function|null} opts.onProgress    
 * @returns {Promise<{ metrics: object, anomalyCount: number, cleanCount: number, durationMs: number }>}
 */
export async function runETLPipeline({
    inputPath,
    outputPath,
    alertEmitter,
    onProgress = null,
}) {
    const start = performance.now();

    const readStream = createReadStream(inputPath, {
        highWaterMark: 64 * 1024,
        encoding: null,
    });

    const csvParser = new CSVParserTransform();
    const metricsAggregator = new MetricsAggregator();
    const anomalyFilter = new AnomalyFilter(alertEmitter, metricsAggregator);

    const outputFileStream = createWriteStream(outputPath, { highWaterMark: 64 * 1024 });
    const cleanWriter = new CleanDataWriter(outputFileStream);

    let progressInterval = null;
    if (onProgress) {
        progressInterval = setInterval(() => {
            onProgress(csvParser.parsedCount);
        }, 1000);
    }

    await pipeline(
        readStream,
        csvParser,
        metricsAggregator,
        anomalyFilter,
        cleanWriter,
    );

    if (progressInterval) clearInterval(progressInterval);

    const durationMs = performance.now() - start;

    return {
        metrics: metricsAggregator.getReport(),
        anomalyCount: anomalyFilter.anomalyCount,
        cleanCount: anomalyFilter.cleanCount,
        parsedRows: csvParser.parsedCount,
        durationMs,
    };
}
