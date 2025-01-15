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

suite
	.on("cycle", (event: Benchmark.Event) => {
		console.log(String(event.target));
	})
	.on("complete", function () {
		console.log(`Fastest is ${this.filter("fastest").map("name")}`);
	})
	.run({ async: true });
