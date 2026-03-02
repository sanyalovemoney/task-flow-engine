export function asyncMapCallback(array, callback, onDone) {
  let results = [];
  let completed = 0;

  array.forEach((item, index) => {
    callback(item, (result) => {
      results[index] = result;
      completed++;
      if (completed === array.length) onDone(results);
    });
  });
}

export function asyncMapPromise(array, asyncFn, signal) {
  return new Promise((resolve, reject) => {
     if (signal?.aborted) return reject(new Error("Aborted"));
    const promises = array.map(async (item) => {
    if (signal?.aborted) throw new Error("Aborted");
      return await asyncFn(item);
    });

    signal?.addEventListener('abort', () => reject(new Error("Aborted")));

    Promise.all(promises).then(resolve).catch(reject);
  });
}