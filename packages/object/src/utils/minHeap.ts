import { HeapInterface } from "./heap.js";
import { Hash } from "../hashgraph/index.js";

export class MinHeap implements HeapInterface<Hash> {
	private readonly heap: Hash[] = [];

	length(): number {
		return this.heap.length;
	}

	push(item: Hash): void {
		this.heap.push(item);
	}

	pop(): Hash | undefined {
		return this.heap.pop();
	}

	less(i: number, j: number): boolean {
		return this.heap[i].localeCompare(this.heap[j]) < 0;
	}

	swap(i: number, j: number): void {
		[this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
	}
}
