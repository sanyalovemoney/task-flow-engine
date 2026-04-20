export const LogLevel = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

const defaultLogger = (data, format) => {
  const payload = {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  };

  if (format === 'json') {
    return console.log(JSON.stringify(payload));
  }

  console.group(`[${payload.level}] ${payload.fn}`);
  Object.entries(payload).forEach(([k, v]) => !['fn', 'level'].includes(k) && console.log(`${k}:`, v));
  console.groupEnd();
};

export function log(opts = {}) {
  const {
    level = 'INFO',
    logArgs = true,
    logResult = true,
    format = 'console',
    logger = defaultLogger,
  } = opts;

  return function (fn) {
    return function (...args) {
      const start = performance.now();

      const doLog = (result) => {
        const duration = `${(performance.now() - start).toFixed(3)}ms`;
        if (level === 'INFO' || level === 'DEBUG') {
          logger(
            {
              level,
              fn: fn.name || 'anon',
              args: logArgs ? args : undefined,
              result: logResult ? result : undefined,
              duration,
            },
            format,
          );
        }
        return result;
      };

      const doError = (error) => {
        if (level === 'ERROR' || level === 'WARN' || level === 'DEBUG') {
          logger(
            {
              level: 'ERROR',
              fn: fn.name || 'anon',
              error: error.message,
              duration: `${(performance.now() - start).toFixed(3)}ms`,
            },
            format,
          );
        }
        throw error;
      };

      try {
        const result = fn.apply(this, args);
        if (result instanceof Promise) {
          return result.then(doLog).catch(doError);
        }
        return doLog(result);
      } catch (error) {
        doError(error);
      }
    };
  };
}

export const logExecution = log({ level: 'INFO' });

export function conditionalLog(condition) {
  return (fn) => function (...args) {
    const result = fn.apply(this, args);

    const check = (res) => {
      if (condition(res, args)) {
        console.log(`[LOG] ${fn.name}:`, { args, result: res, time: new Date().toISOString() });
      }
      return res;
    };

    if (result instanceof Promise) return result.then(check);
    return check(result);
  };
}
