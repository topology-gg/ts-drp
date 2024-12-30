import {
	ActionType,
	type DRP,
	type IACL,
	type ResolveConflictsType,
	SemanticsType,
	type Vertex,
} from "@ts-drp/object";
import { ACL } from "../ACL/index.js";

export class AddWinsSetWithACL<T> implements DRP {
	operations: string[] = ["add", "remove"];
	state: Map<T, boolean>;
	acl: IACL & DRP;
	semanticsType = SemanticsType.pair;

	constructor(admins: Map<string, string>) {
		this.acl = new ACL(admins);
		this.state = new Map<T, boolean>();
	}

	private _add(value: T): void {
		if (!this.state.get(value)) this.state.set(value, true);
	}

	add(sender: string, value: T): void {
		if (this.acl && !this.acl.isWriter(sender)) {
			throw new Error("Only writers can add values.");
		}
		this._add(value);
	}

	private _remove(value: T): void {
		if (this.state.get(value)) this.state.set(value, false);
	}

	remove(sender: string, value: T): void {
		if (this.acl && !this.acl.isWriter(sender)) {
			throw new Error("Only writers can remove values.");
		}
		this._remove(value);
	}

	queryContains(value: T): boolean {
		return this.state.get(value) === true;
	}

	getValues(): T[] {
		return Array.from(this.state.entries())
			.filter(([_, exists]) => exists)
			.map(([value, _]) => value);
	}

	resolveConflicts(vertices: Vertex[]): ResolveConflictsType {
		if (!vertices[0].operation || !vertices[1].operation)
			return { action: ActionType.Nop };
		if (
			vertices[0].operation.type === vertices[1].operation.type ||
			vertices[0].operation.value !== vertices[1].operation.value
		)
			return { action: ActionType.Nop };

		if (
			["grant", "revoke"].includes(vertices[0].operation.type) &&
			["grant", "revoke"].includes(vertices[1].operation.type)
		) {
			return this.acl.resolveConflicts(vertices);
		}

		if (
			this.operations.includes(vertices[0].operation.type) &&
			this.operations.includes(vertices[1].operation.type)
		) {
			return vertices[0].operation.type === "add"
				? { action: ActionType.DropRight }
				: { action: ActionType.DropLeft };
		}

		return { action: ActionType.Nop };
	}
}
