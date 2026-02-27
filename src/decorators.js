export function logExecution(fn) {
  return function(...args) {
    const start = performance.now();
    const result = fn.apply(this, args);
    const end = performance.now();
    console.log(`Execution time: ${(end - start).toFixed(2)} ms`);
    return result;
  };
}