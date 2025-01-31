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
		this._up(this._heap.length() - 1);
	}

	pop(): T | undefined {
		const n = this._heap.length() - 1;
		if (n < 0) return undefined;
		this._heap.swap(0, n);
		this._down(0, n);
		return this._heap.pop();
	}

	remove(i: number): T | undefined {
		const n = this._heap.length() - 1;
		if (n !== i) {
			this._heap.swap(i, n);
			if (!this._down(i, n)) this._up(i);
		}
		return this._heap.pop();
	}

	private _up(j: number): void {
		while (true) {
			const parent = j > 0 ? Math.floor((j - 1) / 2) : 0;
			if (parent === j || !this._heap.less(j, parent)) break;
			this._heap.swap(parent, j);
			j = parent;
		}
	}

	private _down(i0: number, n: number): boolean {
		let i = i0;
		while (true) {
			const left = 2 * i + 1;
			if (left >= n) break;

			let j = left;
			const right = left + 1;
			if (right < n && this._heap.less(right, left)) {
				j = right;
			}
			if (!this._heap.less(j, i)) break;
			this._heap.swap(i, j);
			i = j;
		}

		return i > i0;
	}
}
