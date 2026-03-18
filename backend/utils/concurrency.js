export async function runWithConcurrency(items, worker, maxConcurrency = 5) {
  const results = new Array(items.length);
  let idx = 0;

  async function run() {
    while (true) {
      const i = idx++;
      if (i >= items.length) break;
      results[i] = await worker(items[i], i);
    }
  }

  const workers = Array.from(
    { length: Math.min(maxConcurrency, items.length) },
    () => run()
  );
  await Promise.all(workers);
  return results;
}

