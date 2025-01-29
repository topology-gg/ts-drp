export interface HeapInterface<T> {
	length(): number;
	less(i: number, j: number): boolean;
	swap(i: number, j: number): void;
	push(item: T): void;
	pop(): T | undefined;
}

export class Heap<T> {
	private readonly _heap: HeapInterface<T>;

	constructor(heap: HeapInterface<T>) {
		this._heap = heap;
	}

	length(): number {
		return this._heap.length();
	}

	push(item: T): void {
		this._heap.push(item);
		this.siftUp(this._heap.length() - 1);
	}

	pop(): T | undefined {
		const n = this._heap.length() - 1;
		if (n < 0) return undefined;
		this.swap(0, n);
		this.siftDown(0, n);
		return this._heap.pop();
	}

	remove(i: number): T | undefined {
		const n = this._heap.length() - 1;
		if (n !== i) {
			this.swap(i, n);
			this.siftDown(i, n);
			this.siftUp(i);
		}
		return this._heap.pop();
	}

	siftUp(i: number): void {
		while (i > 0) {
			const parent = Math.floor((i - 1) / 2);
			if (!this._heap.less(i, parent)) break;
			this._heap.swap(i, parent);
			i = parent;
		}
	}

	siftDown(i: number, n: number): void {
		while (true) {
			const left = 2 * i + 1;
			const right = 2 * i + 2;
			let smallest = i;

			if (left < n && this._heap.less(left, smallest)) smallest = left;
			if (right < n && this._heap.less(right, smallest)) smallest = right;
			if (smallest === i) break;

			this._heap.swap(i, smallest);
			i = smallest;
		}
	}

	swap(i: number, j: number): void {
		this._heap.swap(i, j);
	}
}
