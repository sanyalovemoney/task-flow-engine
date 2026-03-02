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
