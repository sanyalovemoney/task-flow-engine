export const LogLevel = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

const defaultLogger = (data, format) => {
  if (format === 'json') return console.log(JSON.stringify(data));
  console.group(`[${data.level}] ${data.fn}`);
  Object.entries(data).forEach(([k, v]) => !['fn', 'level'].includes(k) && console.log(`${k}:`, v));
  console.groupEnd();
};

export function log(opts = {}) {
  const { level = 'INFO', logArgs = true, logResult = true, format = 'console', logger = defaultLogger } = opts;

  return function(fn) {
    return async function(...args) {
      const start = performance.now();
      try {
        const result = await fn.apply(this, args);
        if (LogLevel[level] <= LogLevel.INFO) {
          logger({
            level: 'INFO', fn: fn.name || 'anon',
            args: logArgs ? args : undefined,
            result: logResult ? result : undefined,
            duration: `${(performance.now() - start).toFixed(3)}ms`
          }, format);
        }
        return result;
      } catch (error) {
        logger({ level: 'ERROR', fn: fn.name || 'anon', error: error.message }, format);
        throw error;
      }
    };
  };
}

export const logExecution = log({ level: 'INFO' });

export function conditionalLog(condition) {
  return (fn) => async (...args) => {
    const result = await fn.apply(this, args);
    if (condition(result, args)) {
      console.log(`[LOG] ${fn.name}:`, { args, result, time: new Date().toISOString() });
    }
    return result;
  };
}