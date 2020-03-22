const assert = require('assert')

module.exports = class AsyncQueue {
  constructor(limit) {
    this._limit = 10
    this._active = new Set()
    this._queue = [];
    this._promise = Promise.resolve()
  }
  push(task) {
    return new Promise((resolve, reject) => {
      if (this._active.size < this._limit) {
        this._active.add(task)
        this._promise = Promise.all([
          this._promise,
          task().catch(reject).then(resolve).finally(() => {
            this._active.delete(task)
            if (this._queue.length) {
              const task = this._queue.pop()
              this.push(task)
            }
          })
        ])
      } else {
        this._queue.push(() => {
          return task().catch(reject).then(resolve)
        })
      }
    })
  }
  toPromise() {
    return this._promise
  }
}
