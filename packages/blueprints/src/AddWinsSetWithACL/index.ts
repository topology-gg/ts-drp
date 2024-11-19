import { AccessControl } from "@topology-foundation/blueprints";
import {
	ActionType,
	type CRO,
	type Operation,
	type ResolveConflictsType,
	SemanticsType,
	type Vertex,
} from "@topology-foundation/object";

export class AddWinsSetWithACL<T> implements CRO {
	operations: Set<string> = new Set(["add", "remove"]);
	semanticsType = SemanticsType.pair;

	private _permissions: AccessControl;
	private _state: Map<T, boolean>;

	constructor(admins: string[]) {
		console.log(admins)
		this._permissions = new AccessControl(admins)
		this._state = new Map<T, boolean>();
	}

	private _add(value: T): void {
		if (!this._state.get(value)) this._state.set(value, true);
	}

	add(value: T): void {
		console.log(this)
		console.log((<any>this)['caller'], this._permissions.isAdmin((<any>this)['caller']))
		console.log((<any>this)['caller'], this._permissions.isWriter((<any>this)['caller']))
		if (!this._permissions.isWriter((<any>this)['caller'])) throw new Error("Invoker doesn't have write permissions.")
		this._add(value);
	}

	private _remove(value: T): void {
		if (this._state.get(value)) this._state.set(value, false);
	}

	remove(value: T): void {
		if (!this._permissions.isWriter("")) throw new Error("Invoker doesn't have write permissions.")
		this._remove(value);
	}

	contains(value: T): boolean {
		return this._state.get(value) === true;
	}

	values(): T[] {
		return Array.from(this._state.entries())
			.filter(([_, exists]) => exists)
			.map(([value, _]) => value);
	}

	resolveConflicts(vertices: Vertex[]): ResolveConflictsType {
		if (!vertices[0].operation || !vertices[1].operation) return { action: ActionType.Nop };
		if (
			vertices[0].operation?.type === vertices[1].operation?.type ||
			vertices[0].operation?.value !== vertices[1].operation?.value
		) return { action: ActionType.Nop };

		if (this._permissions.operations.has(vertices[0].operation.type) && this._permissions.operations.has(vertices[0].operation.type)) {
			return this._permissions.resolveConflicts(vertices)
		} else {
			return vertices[0].operation.type === "add"
				? { action: ActionType.DropRight }
				: { action: ActionType.DropLeft };
		}
	}

	// merged at HG level and called as a callback
	// supposed to be abstracted into the lib
	mergeCallback(operations: Operation[]): void {
		this._state = new Map<T, boolean>();

		const { aclOps, thisOps } = operations.reduce(
			(acc: { aclOps: Operation[]; thisOps: Operation[] }, op) => {
				if (this._permissions.operations.has(op.type)) {
					acc.aclOps.push(op);
				} else {
					acc.thisOps.push(op);
				}
				return acc;
			},
			{ aclOps: [], thisOps: [] }
		);

		this._permissions.mergeCallback(aclOps)
		for (const op of thisOps) {
			switch (op.type) {
				case "add":
					if (op.value !== null) this._add(op.value);
					break;
				case "remove":
					if (op.value !== null) this._remove(op.value);
					break;
				default:
					break;
			}
		}
	}
}
