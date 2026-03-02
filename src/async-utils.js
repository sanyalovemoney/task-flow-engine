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

export function asyncMapPromise(array, asyncFn) {
  return new Promise((resolve, reject) => {
    const promises = array.map(async (item) => {
      return await asyncFn(item);
    });

    Promise.all(promises).then(resolve).catch(reject);
  });
}