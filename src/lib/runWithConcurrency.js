// Runs async tasks with a fixed number of workers so a guest can queue
// hundreds of files without firing hundreds of simultaneous requests.
// `tasks` is an array of zero-arg functions returning promises.
export async function runWithConcurrency(tasks, limit = 3) {
  let cursor = 0

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor++
      await tasks[index]()
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker)
  await Promise.all(workers)
}
