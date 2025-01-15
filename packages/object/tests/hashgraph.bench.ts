import { ConflictResolvingMap } from "@topology-foundation/blueprints/src/index.js";
import Benchmark from "benchmark";
import { AddWinsSet } from "../../blueprints/src/AddWinsSet/index.js";
import { DRPObject } from "../src/index.js";

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

benchmarkForAddWinSet("Create HashGraph with 1000 vertices", 1, 1000, false);

benchmarkForAddWinSet(
	"Create 2 DRP Objects (1000 vertices each) and Merge",
	2,
	1000,
	true,
);

suite.add("Create a HashGraph with 1000 vertices for update wins map", () => {
	const object: DRPObject = new DRPObject(
		"peer1",
		new ConflictResolvingMap<number, number>(),
	);
	const drp = object.drp as ConflictResolvingMap<number, number>;
	for (let i = 0; i < 1000; ++i) {
		drp.update(i, i);
	}
});

suite.add(
	"Create a HashGraph with 1000 vertices for update wins map and read",
	() => {
		const object: DRPObject = new DRPObject(
			"peer1",
			new ConflictResolvingMap<number, number>(),
		);
		const drp = object.drp as ConflictResolvingMap<number, number>;
		for (let i = 0; i < 1000; ++i) {
			drp.update(i, i);
		}

		for (let i = 0; i < 1000; ++i) {
			drp.query_get(i);
		}
	},
);

suite.add(
	"Create a HashGraph with 1000 vertices for update wins map and update",
	() => {
		const object: DRPObject = new DRPObject(
			"peer1",
			new ConflictResolvingMap<number, number>(),
		);
		const drp = object.drp as ConflictResolvingMap<number, number>;
		for (let i = 0; i < 1000; ++i) {
			drp.update(i, i);
		}

		for (let i = 0; i < 1000; ++i) {
			drp.update(i, i + 1);
		}
	},
);

suite.add(
	"Create a HashGraph with 1000 vertices for update wins map and remove",
	() => {
		const object: DRPObject = new DRPObject(
			"peer1",
			new ConflictResolvingMap<number, number>(),
		);
		const drp = object.drp as ConflictResolvingMap<number, number>;
		for (let i = 0; i < 1000; ++i) {
			drp.update(i, i);
		}

		for (let i = 0; i < 1000; ++i) {
			drp.remove(i);
		}
	},
);

suite.add("Create a HashGraph with 1000 vertices for update wins map", () => {
	const object: DRPObject = new DRPObject(
		"peer1",
		new ConflictResolvingMap<number, number>(),
	);
	const drp = object.drp as ConflictResolvingMap<number, number>;
	for (let i = 0; i < 1000; ++i) {
		if (i % 3 === 0) {
			drp.update(i, i);
		} else if (i % 3 === 1) {
			if ((i % 3) % 2 === 0) {
				drp.update(i, i);
			} else {
				drp.remove(i);
			}
		} else {
			if ((i % 3) % 2 === 0) {
				drp.remove(i - 1);
			} else {
				drp.update(i - 1, i - 1);
			}
		}
	}
});

suite.add(
	"Create 2 HashGraphs with 1000 vertices each for update wins map and merge",
	() => {
		function initialize(drp: ConflictResolvingMap<number, number>) {
			for (let i = 0; i < 1000; ++i) {
				if (i % 3 === 0) {
					drp.update(i, i);
				} else if (i % 3 === 1) {
					if ((i % 3) % 2 === 0) {
						drp.update(i, i);
					} else {
						drp.remove(i);
					}
				} else {
					if ((i % 3) % 2 === 0) {
						drp.remove(i - 1);
					} else {
						drp.update(i - 1, i - 1);
					}
				}
			}
		}

		const object1: DRPObject = new DRPObject(
			"peer1",
			new ConflictResolvingMap<number, number>(),
		);
		const drp1 = object1.drp as ConflictResolvingMap<number, number>;
		initialize(drp1);

		const object2: DRPObject = new DRPObject(
			"peer2",
			new ConflictResolvingMap<number, number>(),
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
