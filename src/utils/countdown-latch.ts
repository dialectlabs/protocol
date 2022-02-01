import { sleep } from './index';

export class CountDownLatch {
  private count: number;

  constructor(count: number) {
    if (count < 0) {
      throw new Error('count cannot be negative');
    }
    this.count = count;
  }

  public countDown(value = 1) {
    this.count -= value;
  }

  public async await(timeout: number): Promise<void> {
    const failsAt = new Date().getTime() + timeout;
    while (this.count !== 0) {
      if (new Date().getTime() > failsAt) {
        throw new Error(
          `Timeout ${timeout} reached, remaining count = ${this.count}`,
        );
      }
      await sleep(100);
    }
  }
}
