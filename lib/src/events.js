
import { EventEmitter } from 'node:events';

export function createEventEmitter(target) {
    const ee = new EventEmitter();

    const originalEnqueue = target.enqueue.bind(target);
    const originalDequeue = target.dequeue.bind(target);

    target.enqueue = (item, priority) => {
        originalEnqueue(item, priority);
        ee.emit('added', { item, priority });
    };

    target.dequeue = (type) => {
        const item = originalDequeue(type);
        if (item) {
            ee.emit('dequeued', { item, type });
        } else {
            ee.emit('empty');
        }
        return item;
    };

    return ee;
}

const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    brightRed: '\x1b[91m',
    yellow: '\x1b[33m',
    brightYellow: '\x1b[93m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    brightCyan: '\x1b[96m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
};

function classifySeverity(anomalyData) {
    const { amount, statusCode, responseTimeMs, reasons } = anomalyData;

    if (amount > 5_000_000) return 'CRITICAL';
    if (statusCode >= 500 && amount > 1_000_000) return 'CRITICAL';
    if (reasons.length >= 2) return 'HIGH';
    if (amount > 1_000_000) return 'HIGH';
    if (statusCode >= 500) return 'MEDIUM';
    if (responseTimeMs > 4500) return 'LOW';
    return 'INFO';
}

function colorSeverity(severity) {
    const map = {
        CRITICAL: `${COLORS.bgRed}${COLORS.bold} ${severity} ${COLORS.reset}`,
        HIGH: `${COLORS.brightRed}${COLORS.bold}${severity}${COLORS.reset}`,
        MEDIUM: `${COLORS.yellow}${severity}${COLORS.reset}`,
        LOW: `${COLORS.cyan}${severity}${COLORS.reset}`,
        INFO: `${COLORS.gray}${severity}${COLORS.reset}`,
    };
    return map[severity] || severity;
}

function formatTelegramPayload(anomalyData, severity) {
    return {
        chat_id: '@pipeline_alerts',
        parse_mode: 'HTML',
        text: [
            `${COLORS[severity] || ""} <b>ANOMALY DETECTED</b>`,
            ``,
            `<b>Severity:</b> ${severity}`,
            `<b>Record ID:</b> #${anomalyData.id}`,
            `<b>Timestamp:</b> ${anomalyData.timestamp}`,
            `<b>User ID:</b> ${anomalyData.userId}`,
            `<b>IP Address:</b> ${anomalyData.ipAddress}`,
            `<b>Amount:</b> $${anomalyData.amount.toLocaleString()}`,
            `<b>Status:</b> HTTP ${anomalyData.statusCode}`,
            `<b>Response:</b> ${anomalyData.responseTimeMs}ms`,
            ``,
            `<b>Reasons:</b>`,
            ...anomalyData.reasons.map((r) => `  • ${r}`),
            ``,
            `<i>Detected at: ${anomalyData.detectedAt}</i>`,
        ].join('\n'),
    };
}


/**
 * @param {object} opts
 * @param {boolean} opts.enableTerminalAlerts 
 * @param {boolean} opts.enableTelegramSim   
 * @param {boolean} opts.verbose             
 * @param {number}  opts.maxTerminalAlerts   
 * @returns {{ emitter: EventEmitter, getAuditLog: Function, getSummary: Function }}
 */
export function createPipelineAlertSystem({
    enableTerminalAlerts = true,
    enableTelegramSim = true,
    verbose = false,
    maxTerminalAlerts = 25,
} = {}) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(50);


    const auditLog = [];
    let terminalAlertCount = 0;
    let suppressedCount = 0;

    const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };

    if (enableTerminalAlerts) {
        emitter.on('anomaly', (data) => {
            const severity = classifySeverity(data);
            severityCounts[severity]++;
            auditLog.push({ ...data, severity });

            if (terminalAlertCount < maxTerminalAlerts || severity === 'CRITICAL') {
                terminalAlertCount++;

                const line = [
                    `${COLORS.brightRed}${COLORS.bold}⚠  ALERT${COLORS.reset}`,
                    `${colorSeverity(severity)}`,
                    `${COLORS.gray}ID:${COLORS.reset}${data.id}`,
                    `${COLORS.gray}IP:${COLORS.reset}${data.ipAddress}`,
                    `${COLORS.gray}Amount:${COLORS.reset}${COLORS.brightYellow}$${data.amount.toLocaleString()}${COLORS.reset}`,
                    `${COLORS.gray}HTTP:${COLORS.reset}${data.statusCode}`,
                    `${COLORS.dim}${data.reasons.join(' | ')}${COLORS.reset}`,
                ].join('  ');

                console.log(line);
            } else {
                suppressedCount++;
            }
        });
    }

    if (enableTelegramSim) {
        emitter.on('anomaly', (data) => {
            const severity = classifySeverity(data);


            if (severity === 'CRITICAL' || severity === 'HIGH') {
                const payload = formatTelegramPayload(data, severity);

                if (verbose) {
                    console.log(
                        `\n${COLORS.cyan}📱 Telegram Bot Payload:${COLORS.reset}`,
                        JSON.stringify(payload, null, 2)
                    );
                }
            }
        });
    }

    let windowStart = Date.now();
    let windowCount = 0;

    emitter.on('anomaly', () => {
        const now = Date.now();
        if (now - windowStart > 10_000) {
            windowStart = now;
            windowCount = 0;
        }
        windowCount++;

        if (windowCount === 100) {
            emitter.emit('anomaly_burst', {
                count: windowCount,
                windowMs: now - windowStart,
                message: 'Anomaly burst detected: 100+ anomalies in <10s window',
            });
        }
    });

    emitter.on('anomaly_burst', (burstData) => {
        console.log(
            `\n${COLORS.bgRed}${COLORS.bold}  ANOMALY BURST DETECTED  ${COLORS.reset}` +
            ` ${burstData.count} anomalies in ${burstData.windowMs}ms\n`
        );
    });

    function getAuditLog() {
        return [...auditLog];
    }

    function getSummary() {
        return {
            totalAnomalies: auditLog.length,
            severityBreakdown: { ...severityCounts },
            terminalAlertsShown: terminalAlertCount,
            alertsSuppressed: suppressedCount,
            topOffenders: getTopOffenders(),
        };
    }

    function getTopOffenders() {
        const ipCounts = {};
        for (const entry of auditLog) {
            ipCounts[entry.ipAddress] = (ipCounts[entry.ipAddress] || 0) + 1;
        }
        return Object.entries(ipCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([ip, count]) => ({ ip, anomalyCount: count }));
    }

    return { emitter, getAuditLog, getSummary };
}
