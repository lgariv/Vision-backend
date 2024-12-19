export class AsyncQueue {
	private queue: (() => Promise<void>)[] = [];
	private runningCount: number = 0;
	private maxConcurrency: number;

	constructor(maxConcurrency: number) {
		this.maxConcurrency = maxConcurrency;
	}

	enqueue(task: () => Promise<void>): void {
		this.queue.push(task);
		this.run();
	}

	private async run(): Promise<void> {
		while (
			this.runningCount < this.maxConcurrency &&
			this.queue.length > 0
		) {
			const task = this.queue.shift();
			if (task) {
				this.runningCount++;
				task().finally(() => {
					this.runningCount--;
					this.run(); // Run the next task once the current one is complete
				});
			}
		}
	}
}
