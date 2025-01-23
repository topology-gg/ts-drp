import { SetDRP } from "@ts-drp/blueprints/src/index.js";

import { DRPObject, ObjectACL } from "../src/index.js";

const acl = new ObjectACL({
	admins: new Map([["peer1", { ed25519PublicKey: "pubKey1", blsPublicKey: "pubKey1" }]]),
});

type DRPManipulationStrategy = (drp: SetDRP<number>, value: number) => void;

const createWithStrategy = (
	peerId: number,
	verticesPerDRP: number,
	strategy: DRPManipulationStrategy
): DRPObject => {
	const obj = new DRPObject({
		peerId: `peer1_${peerId}`,
		acl,
		drp: new SetDRP<number>(),
	});

	const drp = obj.drp as SetDRP<number>;

	Array.from({ length: verticesPerDRP }).forEach((_, vertex) => {
		strategy(drp, vertex);
	});

	return obj;
};
const manipulationStrategies: DRPManipulationStrategy[] = [
	(drp, value) => drp.add(value),
	(drp, value) => {
		drp.delete(value);
		drp.add(value);
	},
	(drp, value) => {
		drp.add(value);
		drp.delete(value);
	},
];

function createDRPObjects(numDRPs: number, verticesPerDRP: number): DRPObject[] {
	return Array.from({ length: numDRPs }, (_, peerId) =>
		createWithStrategy(peerId, verticesPerDRP, manipulationStrategies[peerId % 3])
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

function flamegraphForSetDRP(numDRPs: number, verticesPerDRP: number, mergeFn: boolean): void {
	const objects = createDRPObjects(numDRPs, verticesPerDRP);

	if (mergeFn) {
		mergeObjects(objects);
	}
}

flamegraphForSetDRP(1, 1000, false);
