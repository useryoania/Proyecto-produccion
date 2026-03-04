class AsyncQueue {
    constructor() {
      this.queue = [];
      this.isProcessing = false;
    }
  
    async enqueue(task) {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try {
            const result = await task();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
        if (!this.isProcessing) {
          this.processQueue();
        }
      });
    }
  
    async processQueue() {
      if (this.isProcessing) return;
      this.isProcessing = true;
  
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        await task();
      }
  
      this.isProcessing = false;
    }
  }
  
  module.exports = AsyncQueue;
  