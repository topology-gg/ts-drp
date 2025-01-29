import * as crypto from "node:crypto";

import { log } from "../index.js";
import { BitSet } from "./bitset.js";
import { linearizeMultipleSemantics } from "../linearize/multipleSemantics.js";
import { linearizePairSemantics } from "../linearize/pairSemantics.js";
import type { Vertex_Operation as Operation, Vertex } from "../proto/drp/object/v1/object_pb.js";
import { Heap } from "../utils/heap.js";
import { MinHeap } from "../utils/minHeap.js";
import { ObjectSet } from "../utils/objectSet.js";

// Reexporting the Vertex and Operation types from the protobuf file
export type { Vertex, Operation };

export type Hash = string;

export enum OperationType {
	NOP = "-1",
}

export enum ActionType {
	DropLeft = 0,
	DropRight = 1,
	Nop = 2,
	Swap = 3,
	Drop = 4,
}

export enum SemanticsType {
	pair = 0,
	multiple = 1,
}

// In the case of multi-vertex semantics, we are returning an array of vertices (their hashes) to be reduced.
export type ResolveConflictsType = {
	action: ActionType;
	vertices?: Hash[];
};

export type VertexDistance = {
	distance: number;
	closestDependency?: Hash;
};

export class HashGraph {
	peerId: string;
	resolveConflictsDRP?: (vertices: Vertex[]) => ResolveConflictsType;
	resolveConflictsACL: (vertices: Vertex[]) => ResolveConflictsType;
	semanticsTypeDRP?: SemanticsType;

	vertices: Map<Hash, Vertex> = new Map();
	frontier: Hash[] = [];
	forwardEdges: Map<Hash, Hash[]> = new Map();
	/*
	computeHash(
		"",
		{ type: OperationType.NOP, value: null },
		[],
		-1,
	);
	*/
	static readonly rootHash: Hash =
		"425d2b1f5243dbf23c685078034b06fbfa71dc31dcce30f614e28023f140ff13";
	private arePredecessorsFresh = false;
	private reachablePredecessors: Map<Hash, BitSet> = new Map();
	private topoSortedIndex: Map<Hash, number> = new Map();
	private vertexDistances: Map<Hash, VertexDistance> = new Map();
	// We start with a bitset of size 1, and double it every time we reach the limit
	private currentBitsetSize = 1;

	constructor(
		peerId: string,
		resolveConflictsACL: (vertices: Vertex[]) => ResolveConflictsType,
		resolveConflictsDRP?: (vertices: Vertex[]) => ResolveConflictsType,
		semanticsTypeDRP?: SemanticsType
	) {
		this.peerId = peerId;
		this.resolveConflictsACL = resolveConflictsACL;
		this.resolveConflictsDRP = resolveConflictsDRP;
		this.semanticsTypeDRP = semanticsTypeDRP;

		const rootVertex: Vertex = {
			hash: HashGraph.rootHash,
			peerId: "",
			operation: {
				drpType: "",
				opType: OperationType.NOP,
				value: null,
			},
			dependencies: [],
			timestamp: -1,
			signature: new Uint8Array(),
		};
		this.vertices.set(HashGraph.rootHash, rootVertex);
		this.frontier.push(HashGraph.rootHash);
		this.forwardEdges.set(HashGraph.rootHash, []);
		this.vertexDistances.set(HashGraph.rootHash, {
			distance: 0,
		});
	}

	resolveConflicts(vertices: Vertex[]): ResolveConflictsType {
		if (vertices[0].operation?.drpType === "ACL") {
			return this.resolveConflictsACL(vertices);
		}
		return this.resolveConflictsDRP
			? this.resolveConflictsDRP(vertices)
			: { action: ActionType.Nop };
	}

	addToFrontier(operation: Operation): Vertex {
		const deps = this.getFrontier();
		const currentTimestamp = Date.now();
		const hash = computeHash(this.peerId, operation, deps, currentTimestamp);

		const vertex: Vertex = {
			hash,
			peerId: this.peerId,
			operation: operation ?? { opType: OperationType.NOP },
			dependencies: deps,
			timestamp: currentTimestamp,
			signature: new Uint8Array(),
		};

		this.vertices.set(hash, vertex);
		this.frontier.push(hash);

		// Update forward edges
		for (const dep of deps) {
			if (!this.forwardEdges.has(dep)) {
				this.forwardEdges.set(dep, []);
			}
			this.forwardEdges.get(dep)?.push(hash);
		}

		// Compute the distance of the vertex
		const vertexDistance: VertexDistance = {
			distance: Number.MAX_VALUE,
			closestDependency: "",
		};
		for (const dep of deps) {
			const depDistance = this.vertexDistances.get(dep);
			if (depDistance && depDistance.distance + 1 < vertexDistance.distance) {
				vertexDistance.distance = depDistance.distance + 1;
				vertexDistance.closestDependency = dep;
			}
		}
		this.vertexDistances.set(hash, vertexDistance);

		const depsSet = new Set(deps);
		this.frontier = this.frontier.filter((hash) => !depsSet.has(hash));
		this.arePredecessorsFresh = false;

		return vertex;
	}

	/* Add a vertex to the hashgraph with the given operation and dependencies.
	 * If the vertex already exists, return the hash of the existing vertex.
	 * Throws an error if any of the dependencies are not present in the hashgraph.
	 */
	addVertex(
		operation: Operation,
		deps: Hash[],
		peerId: string,
		timestamp: number,
		signature: Uint8Array
	): Hash {
		const hash = computeHash(peerId, operation, deps, timestamp);
		if (this.vertices.has(hash)) {
			return hash; // Vertex already exists
		}

		for (const dep of deps) {
			const vertex = this.vertices.get(dep);
			if (vertex === undefined) {
				throw new Error("Invalid dependency detected.");
			}
			if (vertex.timestamp > timestamp) {
				// Vertex's timestamp must not be less than any of its dependencies' timestamps
				throw new Error("Invalid timestamp detected.");
			}
		}

		const currentTimestamp = Date.now();
		if (timestamp > currentTimestamp) {
			// Vertex created in the future is invalid
			throw new Error("Invalid timestamp detected.");
		}

		const vertex: Vertex = {
			hash,
			peerId,
			operation,
			dependencies: deps,
			timestamp,
			signature,
		};
		this.vertices.set(hash, vertex);
		this.frontier.push(hash);

		// Update forward edges
		for (const dep of deps) {
			if (!this.forwardEdges.has(dep)) {
				this.forwardEdges.set(dep, []);
			}
			this.forwardEdges.get(dep)?.push(hash);
		}

		// Compute the distance of the vertex
		const vertexDistance: VertexDistance = {
			distance: Number.MAX_VALUE,
			closestDependency: "",
		};
		for (const dep of deps) {
			const depDistance = this.vertexDistances.get(dep);
			if (depDistance && depDistance.distance + 1 < vertexDistance.distance) {
				vertexDistance.distance = depDistance.distance + 1;
				vertexDistance.closestDependency = dep;
			}
		}
		this.vertexDistances.set(hash, vertexDistance);

		const depsSet = new Set(deps);
		this.frontier = this.frontier.filter((hash) => !depsSet.has(hash));
		this.arePredecessorsFresh = false;
		return hash;
	}

	dfsTopologicalSort(origin: Hash, subgraph: ObjectSet<Hash>): Hash[] {
		const visited = new Set<Hash>();
		const result: Hash[] = [];
		const tempStack = new Set<Hash>();

		const dfs = (node: Hash) => {
			if (tempStack.has(node)) throw new Error("Graph contains a cycle!");
			if (visited.has(node)) return;

			tempStack.add(node);
			visited.add(node);

			for (const neighbor of this.forwardEdges.get(node) || []) {
				if (subgraph.has(neighbor)) {
					dfs(neighbor);
				}
			}

			tempStack.delete(node);
			result.push(node);
		};

		dfs(origin);

		return result.reverse();
	}

	dfsTopologicalSortIterative(origin: Hash, subgraph: ObjectSet<Hash>): Hash[] {
		const visited = new Set<Hash>();
		const result: Hash[] = [];
		const stack: Hash[] = [origin];
		const processing = new Set<Hash>();

		while (stack.length > 0) {
			const node = stack[stack.length - 1];

			if (processing.has(node)) throw new Error("Graph contains a cycle!");
			if (visited.has(node)) {
				stack.pop();
				result.push(node);
				continue;
			}

			processing.add(node);
			visited.add(node);

			const neighbors = this.forwardEdges.get(node);
			if (neighbors) {
				for (const neighbor of neighbors) {
					if (subgraph.has(neighbor) && !visited.has(neighbor)) {
						stack.push(neighbor);
					}
				}
			}
			processing.delete(node);
		}

		return result.reverse();
	}

	kahnsAlgorithm(origin: Hash, subgraph: ObjectSet<Hash>): Hash[] {
		const result: Hash[] = [];
		const inDegree = new Map<Hash, number>();
		const queue: Heap<Hash> = new Heap(new MinHeap());

		for (const hash of subgraph.entries()) {
			inDegree.set(hash, 0);
		}

		for (const [vertex, children] of this.forwardEdges) {
			if (!inDegree.has(vertex)) continue;
			for (const child of children) {
				if (!inDegree.has(child)) continue;
				inDegree.set(child, (inDegree.get(child) || 0) + 1);
			}
		}

		queue.push(origin);
		while (queue.length() > 0) {
			const current = queue.pop();
			if (!current) continue;

			result.push(current);

			for (const child of this.forwardEdges.get(current) || []) {
				if (!inDegree.has(child)) continue;
				const oldDeg = inDegree.get(child) || 0;
				const newDeg = oldDeg - 1;
				inDegree.set(child, newDeg);
				if (newDeg === 0) {
					queue.push(child);
				}
			}
		}

		return result;
	}

	/* Topologically sort the vertices in the whole hashgraph or the past of a given vertex. */
	topologicalSort(
		updateBitsets = false,
		origin: Hash = HashGraph.rootHash,
		subgraph: ObjectSet<Hash> = new ObjectSet(this.vertices.keys())
	): Hash[] {
		const result = this.kahnsAlgorithm(origin, subgraph);
		if (!updateBitsets) return result;
		this.reachablePredecessors.clear();
		this.topoSortedIndex.clear();

		// Double the size until it's enough to hold all the vertices
		while (this.currentBitsetSize < result.length) this.currentBitsetSize *= 2;

		for (let i = 0; i < result.length; i++) {
			this.topoSortedIndex.set(result[i], i);
			this.reachablePredecessors.set(result[i], new BitSet(this.currentBitsetSize));
			for (const dep of this.vertices.get(result[i])?.dependencies || []) {
				const depReachable = this.reachablePredecessors.get(dep);
				depReachable?.set(this.topoSortedIndex.get(dep) || 0, true);
				if (depReachable) {
					const reachable = this.reachablePredecessors.get(result[i]);
					this.reachablePredecessors.set(result[i], reachable?.or(depReachable) || depReachable);
				}
			}
		}

		this.arePredecessorsFresh = true;
		return result;
	}

	linearizeOperations(
		origin: Hash = HashGraph.rootHash,
		subgraph: ObjectSet<string> = new ObjectSet(this.vertices.keys())
	): Operation[] {
		switch (this.semanticsTypeDRP) {
			case SemanticsType.pair:
				return linearizePairSemantics(this, origin, subgraph);
			case SemanticsType.multiple:
				return linearizeMultipleSemantics(this, origin, subgraph);
			default:
				return [];
		}
	}

	lowestCommonAncestorMultipleVertices(hashes: Hash[], visited: ObjectSet<Hash>): Hash {
		if (hashes.length === 0) {
			throw new Error("Vertex dependencies are empty");
		}
		if (hashes.length === 1) {
			visited.add(hashes[0]);
			return hashes[0];
		}
		let lca: Hash | undefined = hashes[0];
		const targetVertices: Hash[] = [...hashes];
		for (let i = 1; i < targetVertices.length; i++) {
			if (!lca) {
				throw new Error("LCA not found");
			}
			if (!visited.has(targetVertices[i])) {
				lca = this.lowestCommonAncestorPairVertices(
					lca,
					targetVertices[i],
					visited,
					targetVertices
				);
			}
		}
		if (!lca) {
			throw new Error("LCA not found");
		}
		return lca;
	}

	private lowestCommonAncestorPairVertices(
		hash1: Hash,
		hash2: Hash,
		visited: ObjectSet<Hash>,
		targetVertices: Hash[]
	): Hash | undefined {
		let currentHash1 = hash1;
		let currentHash2 = hash2;
		visited.add(currentHash1);
		visited.add(currentHash2);

		while (currentHash1 !== currentHash2) {
			const distance1 = this.vertexDistances.get(currentHash1);
			if (!distance1) {
				log.error("::hashgraph::LCA: Vertex not found");
				return;
			}
			const distance2 = this.vertexDistances.get(currentHash2);
			if (!distance2) {
				log.error("::hashgraph::LCA: Vertex not found");
				return;
			}

			if (distance1.distance > distance2.distance) {
				if (!distance1.closestDependency) {
					log.error("::hashgraph::LCA: Closest dependency not found");
					return;
				}
				for (const dep of this.vertices.get(currentHash1)?.dependencies || []) {
					if (dep !== distance1.closestDependency && !visited.has(dep)) {
						targetVertices.push(dep);
					}
				}
				currentHash1 = distance1.closestDependency;
				if (visited.has(currentHash1)) {
					return currentHash2;
				}
				visited.add(currentHash1);
			} else {
				if (!distance2.closestDependency) {
					log.error("::hashgraph::LCA: Closest dependency not found");
					return;
				}
				for (const dep of this.vertices.get(currentHash2)?.dependencies || []) {
					if (dep !== distance2.closestDependency && !visited.has(dep)) {
						targetVertices.push(dep);
					}
				}
				currentHash2 = distance2.closestDependency;
				if (visited.has(currentHash2)) {
					return currentHash1;
				}
				visited.add(currentHash2);
			}
		}
		return currentHash1;
	}

	areCausallyRelatedUsingBitsets(hash1: Hash, hash2: Hash): boolean {
		if (!this.arePredecessorsFresh) {
			this.topologicalSort(true);
		}
		const test1 =
			this.reachablePredecessors.get(hash1)?.get(this.topoSortedIndex.get(hash2) || 0) || false;
		const test2 =
			this.reachablePredecessors.get(hash2)?.get(this.topoSortedIndex.get(hash1) || 0) || false;
		return test1 || test2;
	}

	swapReachablePredecessors(hash1: Hash, hash2: Hash): void {
		const reachable1 = this.reachablePredecessors.get(hash1);
		const reachable2 = this.reachablePredecessors.get(hash2);
		if (!reachable1 || !reachable2) return;
		this.reachablePredecessors.set(hash1, reachable2);
		this.reachablePredecessors.set(hash2, reachable1);
	}

	private _areCausallyRelatedUsingBFS(start: Hash, target: Hash): boolean {
		const visited = new Set<Hash>();
		const queue: Hash[] = [];
		let head = 0;

		queue.push(start);

		while (head < queue.length) {
			const current = queue[head];
			head++;

			if (current === target) return true;
			if (current === undefined) continue;

			visited.add(current);
			const vertex = this.vertices.get(current);
			if (!vertex) continue;

			for (const dep of vertex.dependencies) {
				if (!visited.has(dep)) {
					queue.push(dep);
				}
			}

			if (head > queue.length / 2) {
				queue.splice(0, head);
				head = 0;
			}
		}
		return false;
	}

	selfCheckConstraints(): boolean {
		const degree = new Map<Hash, number>();
		for (const vertex of this.getAllVertices()) {
			const hash = vertex.hash;
			degree.set(hash, 0);
		}
		for (const [_, children] of this.forwardEdges) {
			for (const child of children) {
				degree.set(child, (degree.get(child) || 0) + 1);
			}
		}
		for (const vertex of this.getAllVertices()) {
			const hash = vertex.hash;
			if (degree.get(hash) !== vertex.dependencies.length) {
				return false;
			}
			if (vertex.dependencies.length === 0) {
				if (hash !== HashGraph.rootHash) {
					return false;
				}
			}
		}

		const topoOrder = this.kahnsAlgorithm(HashGraph.rootHash, new ObjectSet(this.vertices.keys()));

		for (const vertex of this.getAllVertices()) {
			if (!topoOrder.includes(vertex.hash)) {
				return false;
			}
		}
		return true;
	}

	areCausallyRelatedUsingBFS(hash1: Hash, hash2: Hash): boolean {
		return (
			this._areCausallyRelatedUsingBFS(hash1, hash2) ||
			this._areCausallyRelatedUsingBFS(hash2, hash1)
		);
	}

	getFrontier(): Hash[] {
		return Array.from(this.frontier);
	}

	getDependencies(vertexHash: Hash): Hash[] {
		return Array.from(this.vertices.get(vertexHash)?.dependencies || []);
	}

	getVertex(hash: Hash): Vertex | undefined {
		return this.vertices.get(hash);
	}

	getAllVertices(): Vertex[] {
		return Array.from(this.vertices.values());
	}

	getReachablePredecessors(hash: Hash): BitSet | undefined {
		return this.reachablePredecessors.get(hash);
	}

	getCurrentBitsetSize(): number {
		return this.currentBitsetSize;
	}
}

function computeHash(peerId: string, operation: Operation, deps: Hash[], timestamp: number): Hash {
	const serialized = JSON.stringify({ operation, deps, peerId, timestamp });
	const hash = crypto.createHash("sha256").update(serialized).digest("hex");
	return hash;
}
