export function logExecution(fn) {
  return function(...args) {

    return fn.apply(this, args);
  };
}