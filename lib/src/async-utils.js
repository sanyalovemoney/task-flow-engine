export function asyncMapCallback(array, callback, onDone) {
  if (array.length === 0) {
    onDone([]);
    return;
  }

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

    const onAbort = () => reject(new Error("Aborted"));
    signal?.addEventListener('abort', onAbort, { once: true });

    const promises = array.map(async (item) => {
      if (signal?.aborted) throw new Error("Aborted");
      return await asyncFn(item);
    });

    Promise.all(promises)
      .then((results) => {
        signal?.removeEventListener('abort', onAbort);
        resolve(results);
      })
      .catch((err) => {
        signal?.removeEventListener('abort', onAbort);
        reject(err);
      });
  });
}
