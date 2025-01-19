export class ObjectSet<T extends string | number | symbol> {
	set: { [key in T]: boolean };

	constructor(iterable: Iterable<T> = []) {
		this.set = {} as { [key in T]: boolean };
		for (const item of iterable) {
			this.set[item] = true;
		}
		//this.add = traceFunc("ObjectSet.set", this.add.bind(this));
		//this.delete = traceFunc("ObjectSet.delete", this.delete.bind(this));
		//this.has = traceFunc("ObjectSet.has", this.has.bind(this));
		//this.entries = traceFunc("ObjectSet.entries", this.entries.bind(this));
	}

	add(item: T): void {
		this.set[item] = true;
	}

	delete(item: T): void {
		delete this.set[item];
	}

	has(item: T): boolean {
		return this.set[item] === true;
	}

	entries(): Array<T> {
		return Object.keys(this.set) as Array<T>;
	}
}
