import { AddWinsSet } from "../../blueprints/src/AddWinsSet/index.js";
import { DRPObject } from "../src/index.js";

type DRPManipulationStrategy = (
	drp: AddWinsSet<number>,
	vertex: number,
) => void;

const createWithStrategy = (
	peerId: number,
	verticesPerDRP: number,
	strategy: DRPManipulationStrategy,
): DRPObject => {
	const obj = new DRPObject(
		`peer${peerId + 1}`,
		new AddWinsSet<number>(),
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		null as any,
	);

	const drp = obj.drp as AddWinsSet<number>;

	Array.from({ length: verticesPerDRP }).forEach((_, vertex) => {
		strategy(drp, vertex);
	});

	return obj;
};
const manipulationStrategies: DRPManipulationStrategy[] = [
	(drp, vertex) => drp.add(vertex),
	(drp, vertex) => {
		drp.remove(vertex);
		drp.add(vertex);
	},
	(drp, vertex) => {
		drp.add(vertex);
		drp.remove(vertex);
	},
];

function createDRPObjects(
	numDRPs: number,
	verticesPerDRP: number,
): DRPObject[] {
	return Array.from({ length: numDRPs }, (_, peerId) =>
		createWithStrategy(
			peerId,
			verticesPerDRP,
			manipulationStrategies[peerId % 3],
		),
	);
}

function mergeObjects(objects: DRPObject[]): void {
	objects.forEach((sourceObject, sourceIndex) => {
		objects.forEach((targetObject, targetIndex) => {
			if (sourceIndex !== targetIndex) {
				sourceObject.merge(targetObject.hashGraph.getAllVertices());
			}
		});
	});
}

function flamegraphForAddWinSet(
	numDRPs: number,
	verticesPerDRP: number,
	mergeFn: boolean,
): void {
	const objects = createDRPObjects(numDRPs, verticesPerDRP);

	if (mergeFn) {
		mergeObjects(objects);
	}
}

flamegraphForAddWinSet(1, 1000, false);
