import * as crypto from "node:crypto";
import { log } from "../index.js";
import { linearizeMultipleSemantics } from "../linearize/multipleSemantics.js";
import { linearizePairSemantics } from "../linearize/pairSemantics.js";
import type {
	Vertex_Operation as Operation,
	Vertex,
} from "../proto/drp/object/v1/object_pb.js";
import { ObjectSet } from "../utils/objectSet.js";
import { BitSet } from "./bitset.js";

// Reexporting the Vertex and Operation types from the protobuf file
export type { Vertex, Operation };

export type Hash = string;

export enum DepthFirstSearchState {
	UNVISITED = 0,
	VISITING = 1,
	VISITED = 2,
}

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
	nodeId: string;
	resolveConflicts: (vertices: Vertex[]) => ResolveConflictsType;
	semanticsType: SemanticsType;

	vertices: Map<Hash, Vertex> = new Map();
	frontier: Hash[] = [];
	forwardEdges: Map<Hash, Hash[]> = new Map();
	/*
	computeHash(
		"",
		{ type: OperationType.NOP },
		[],
	)
	*/
	static readonly rootHash: Hash =
		"02465e287e3d086f12c6edd856953ca5ad0f01d6707bf8e410b4a601314c1ca5";
	private arePredecessorsFresh = false;
	private reachablePredecessors: Map<Hash, BitSet> = new Map();
	private topoSortedIndex: Map<Hash, number> = new Map();
	private vertexDistances: Map<Hash, VertexDistance> = new Map();
	// We start with a bitset of size 1, and double it every time we reach the limit
	private currentBitsetSize = 1;

	constructor(
		nodeId: string,
		resolveConflicts: (vertices: Vertex[]) => ResolveConflictsType,
		semanticsType: SemanticsType,
	) {
		this.nodeId = nodeId;
		this.resolveConflicts = resolveConflicts;
		this.semanticsType = semanticsType;

		const rootVertex: Vertex = {
			hash: HashGraph.rootHash,
			nodeId: "",
			operation: {
				type: OperationType.NOP,
				value: null,
			},
			dependencies: [],
			signature: "",
		};
		this.vertices.set(HashGraph.rootHash, rootVertex);
		this.frontier.push(HashGraph.rootHash);
		this.forwardEdges.set(HashGraph.rootHash, []);
		this.vertexDistances.set(HashGraph.rootHash, {
			distance: 0,
		});
	}

	addToFrontier(operation: Operation): Vertex {
		const deps = this.getFrontier();
		const hash = computeHash(this.nodeId, operation, deps);

		const vertex: Vertex = {
			hash,
			nodeId: this.nodeId,
			operation: operation ?? { type: OperationType.NOP },
			dependencies: deps,
			signature: "",
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
		nodeId: string,
		signature: string,
	): Hash {
		const hash = computeHash(nodeId, operation, deps);
		if (this.vertices.has(hash)) {
			return hash; // Vertex already exists
		}

		if (
			!deps.every((dep) => this.forwardEdges.has(dep) || this.vertices.has(dep))
		) {
			throw new Error("Invalid dependency detected.");
		}

		const vertex: Vertex = {
			hash,
			nodeId,
			operation,
			dependencies: deps,
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

	depthFirstSearch(
		origin: Hash,
		subgraph: ObjectSet<Hash>,
		visited: Map<Hash, number> = new Map(),
	): Hash[] {
		const result: Hash[] = [];
		for (const hash of subgraph.entries()) {
			visited.set(hash, DepthFirstSearchState.UNVISITED);
		}
		const visit = (hash: Hash) => {
			visited.set(hash, DepthFirstSearchState.VISITING);

			const children = this.forwardEdges.get(hash) || [];
			for (const child of children) {
				if (!subgraph.has(child)) continue;
				if (visited.get(child) === DepthFirstSearchState.VISITING) {
					log.error("::hashgraph::DFS: Cycle detected");
					return;
				}
				if (visited.get(child) === undefined) {
					log.error("::hashgraph::DFS: Undefined child");
					return;
				}
				if (visited.get(child) === DepthFirstSearchState.UNVISITED) {
					visit(child);
				}
			}

			result.push(hash);
			visited.set(hash, DepthFirstSearchState.VISITED);
		};

		visit(origin);

		return result;
	}

	/* Topologically sort the vertices in the whole hashgraph or the past of a given vertex. */
	topologicalSort(
		updateBitsets = false,
		origin: Hash = HashGraph.rootHash,
		subgraph: ObjectSet<Hash> = new ObjectSet(this.vertices.keys()),
	): Hash[] {
		const result = this.depthFirstSearch(origin, subgraph);
		result.reverse();
		if (!updateBitsets) return result;
		this.reachablePredecessors.clear();
		this.topoSortedIndex.clear();

		// Double the size until it's enough to hold all the vertices
		while (this.currentBitsetSize < result.length) this.currentBitsetSize *= 2;

		for (let i = 0; i < result.length; i++) {
			this.topoSortedIndex.set(result[i], i);
			this.reachablePredecessors.set(
				result[i],
				new BitSet(this.currentBitsetSize),
			);
			for (const dep of this.vertices.get(result[i])?.dependencies || []) {
				const depReachable = this.reachablePredecessors.get(dep);
				depReachable?.set(this.topoSortedIndex.get(dep) || 0, true);
				if (depReachable) {
					const reachable = this.reachablePredecessors.get(result[i]);
					this.reachablePredecessors.set(
						result[i],
						reachable?.or(depReachable) || depReachable,
					);
				}
			}
		}

		this.arePredecessorsFresh = true;
		return result;
	}

	linearizeOperations(
		origin: Hash = HashGraph.rootHash,
		subgraph: ObjectSet<string> = new ObjectSet(this.vertices.keys()),
	): Operation[] {
		switch (this.semanticsType) {
			case SemanticsType.pair:
				return linearizePairSemantics(this, origin, subgraph);
			case SemanticsType.multiple:
				return linearizeMultipleSemantics(this, origin, subgraph);
			default:
				return [];
		}
	}

	lowestCommonAncestorMultipleVertices(
		hashes: Hash[],
		visited: ObjectSet<Hash>,
	): Hash {
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
					targetVertices,
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
		targetVertices: Hash[],
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
			this.reachablePredecessors
				.get(hash1)
				?.get(this.topoSortedIndex.get(hash2) || 0) || false;
		const test2 =
			this.reachablePredecessors
				.get(hash2)
				?.get(this.topoSortedIndex.get(hash1) || 0) || false;
		return test1 || test2;
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

		const visited = new Map<Hash, number>();
		this.depthFirstSearch(
			HashGraph.rootHash,
			new ObjectSet(this.vertices.keys()),
			visited,
		);
		for (const vertex of this.getAllVertices()) {
			if (!visited.has(vertex.hash)) {
				return false;
			}
		}

		return true;
	}

	findNextCausallyUnrelated(hash: Hash, start: number): number | undefined {
		return this.reachablePredecessors.get(hash)?.findNext(start, 0);
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

function computeHash<T>(
	nodeId: string,
	operation: Operation,
	deps: Hash[],
): Hash {
	const serialized = JSON.stringify({ operation, deps, nodeId });
	const hash = crypto.createHash("sha256").update(serialized).digest("hex");
	return hash;
}
