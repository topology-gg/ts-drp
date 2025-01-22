import { ConflictResolvingMap } from "@topology-foundation/blueprints/src/index.js";
import Benchmark from "benchmark";
import { AddWinsSet } from "../../blueprints/src/AddWinsSet/index.js";
import { DRPObject } from "../src/index.js";

const NUMBER_OF_DRPS = Number.parseInt(process.argv[2], 10) || 1000;

function benchmarkForAddWinSet(
	name: string,
	numDRPs: number,
	verticesPerDRP: number,
	mergeFn: boolean,
) {
	return suite.add(name, () => {
		const objects: DRPObject[] = [];
		for (let i = 0; i < numDRPs; i++) {
			const obj: DRPObject = new DRPObject(
				`peer${i + 1}`,
				new AddWinsSet<number>(),
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				null as any,
			);
			const drp = obj.drp as AddWinsSet<number>;
			for (let j = 0; j < verticesPerDRP; j++) {
				if (i % 3 === 2) {
					drp.add(j);
					drp.remove(j);
				} else if (i % 3 === 1) {
					drp.remove(j);
					drp.add(j);
				} else {
					drp.add(j);
				}
			}
			objects.push(obj);
		}

		if (mergeFn) {
			for (let i = 0; i < objects.length; i++) {
				for (let j = 0; j < objects.length; j++) {
					if (i !== j) {
						objects[i].merge(objects[j].hashGraph.getAllVertices());
					}
				}
			}
		}
	});
}
const suite = new Benchmark.Suite();

benchmarkForAddWinSet(
	`Create HashGraph with ${NUMBER_OF_DRPS} vertices1`,
	1,
	NUMBER_OF_DRPS,
	false,
);

benchmarkForAddWinSet(
	`Create 2 DRP Objects (${NUMBER_OF_DRPS} vertices each) and Merge`,
	2,
	NUMBER_OF_DRPS,
	true,
);

suite.add(
	`Create a HashGraph with ${NUMBER_OF_DRPS} operations for set wins map`,
	() => {
		const object: DRPObject = new DRPObject(
			"peer1",
			new ConflictResolvingMap<number, number>(),
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			null as any,
		);
		const drp = object.drp as ConflictResolvingMap<number, number>;
		for (let i = 0; i < NUMBER_OF_DRPS; ++i) {
			drp.set(i, i);
		}
	},
);

suite.add(
	`Create a HashGraph with ${NUMBER_OF_DRPS} operations for set wins map and read`,
	() => {
		const object: DRPObject = new DRPObject(
			"peer1",
			new ConflictResolvingMap<number, number>(),
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			null as any,
		);
		const drp = object.drp as ConflictResolvingMap<number, number>;
		for (let i = 0; i < NUMBER_OF_DRPS; ++i) {
			drp.set(i, i);
		}

		for (let i = 0; i < NUMBER_OF_DRPS; ++i) {
			drp.query_get(i);
		}
	},
);

suite.add(
	`Create a HashGraph with ${NUMBER_OF_DRPS} operations for set wins map and set`,
	() => {
		const object: DRPObject = new DRPObject(
			"peer1",
			new ConflictResolvingMap<number, number>(),
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			null as any,
		);
		const drp = object.drp as ConflictResolvingMap<number, number>;
		for (let i = 0; i < NUMBER_OF_DRPS; ++i) {
			drp.set(i, i);
		}

		for (let i = 0; i < NUMBER_OF_DRPS; ++i) {
			drp.set(i, i + 1);
		}
	},
);

suite.add(
	`Create a HashGraph with ${NUMBER_OF_DRPS} operations for set wins map and delete`,
	() => {
		const object: DRPObject = new DRPObject(
			"peer1",
			new ConflictResolvingMap<number, number>(),
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			null as any,
		);
		const drp = object.drp as ConflictResolvingMap<number, number>;
		for (let i = 0; i < NUMBER_OF_DRPS; ++i) {
			drp.set(i, i);
		}

		for (let i = 0; i < NUMBER_OF_DRPS; ++i) {
			drp.delete(i);
		}
	},
);

suite.add(
	`Create a HashGraph with ${NUMBER_OF_DRPS} operations for set wins map with random operations`,
	() => {
		const object: DRPObject = new DRPObject(
			"peer1",
			new ConflictResolvingMap<number, number>(),
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			null as any,
		);
		const drp = object.drp as ConflictResolvingMap<number, number>;
		for (let i = 0; i < 250; i += 4) {
			drp.set(i, i);
			if (i % 2 === 0) {
				drp.delete(i);
				drp.set(i, i + 1);
			} else {
				drp.set(i, i + 1);
				drp.delete(i);
			}
			if (i % 2 === 0) {
				drp.query_get(i);
			} else {
				drp.query_has(i);
			}
		}
	},
);

suite.add(
	`Create 2 HashGraphs with ${NUMBER_OF_DRPS} operations each for set wins map and merge with random operations`,
	() => {
		function initialize(drp: ConflictResolvingMap<number, number>) {
			for (let i = 0; i < 250; i += 4) {
				drp.set(i, i);
				if (i % 2 === 0) {
					drp.delete(i);
					drp.set(i, i + 1);
				} else {
					drp.set(i, i + 1);
					drp.delete(i);
				}
				if (i % 2 === 0) {
					drp.query_get(i);
				} else {
					drp.query_has(i);
				}
			}
		}

		const object1: DRPObject = new DRPObject(
			"peer1",
			new ConflictResolvingMap<number, number>(),
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			null as any,
		);
		const drp1 = object1.drp as ConflictResolvingMap<number, number>;
		initialize(drp1);

		const object2: DRPObject = new DRPObject(
			"peer2",
			new ConflictResolvingMap<number, number>(),
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			null as any,
		);
		const drp2 = object2.drp as ConflictResolvingMap<number, number>;
		initialize(drp2);

		object1.merge(object2.hashGraph.getAllVertices());
		object2.merge(object1.hashGraph.getAllVertices());
	},
);

suite
	.on("cycle", (event: Benchmark.Event) => {
		console.log(String(event.target));
	})
	.on("complete", function (this: Benchmark.Suite) {
		console.log(`Fastest is ${this.filter("fastest").map("name")}`);
	})
	.run({ async: true });
