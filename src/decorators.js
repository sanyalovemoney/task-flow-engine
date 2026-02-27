export function logExecution(fn) {
  const loggedFn = function(...args) {
    const start = performance.now();
    const result = fn.apply(this, args);
    const end = performance.now();

    console.group(`log for: ${fn.name}`);
    console.log("Input data:", args);
    console.log(`Execution time: ${(end - start).toFixed(3)}ms`);
    console.groupEnd();

    return result;
  };
  Object.defineProperty(loggedFn, 'name', { value: fn.name || 'unknown' });
  return loggedFn;
}