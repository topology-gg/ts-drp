import {
	ActionType,
	type DRP,
	type IACL,
	type ResolveConflictsType,
	SemanticsType,
	type Vertex,
} from "@ts-drp/object";
import { ACL } from "../AccessControl/index.js";

export class AddWinsSetWithACL<T> implements DRP {
	operations: string[] = ["add", "remove"];
	state: Map<T, boolean>;
	acl?: IACL & DRP;
	semanticsType = SemanticsType.pair;

	constructor(admins?: Map<string, string>) {
		if (admins) {
			this.acl = new ACL(admins);
		}
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

	grant(sender: string, target: string, publicKey: string): void {
		if (!this.acl) {
			throw new Error("acl is undefined.");
		}
		if (!this.acl.isAdmin(sender)) {
			throw new Error("Only admins can grant access.");
		}
		this.acl.grant(target, publicKey);
	}

	revoke(sender: string, target: string): void {
		if (!this.acl) {
			throw new Error("acl is undefined.");
		}
		if (!this.acl.isAdmin(sender)) {
			throw new Error("Only admins can revoke access.");
		}
		if (this.acl.isAdmin(target)) {
			throw new Error(
				"Cannot revoke permissions from a node with admin privileges.",
			);
		}
		this.acl.revoke(target);
	}

	contains(value: T): boolean {
		return this.state.get(value) === true;
	}

	isAdmin(peerId: string): boolean | undefined {
		return this.acl?.isAdmin(peerId);
	}

	isWriter(peerId: string): boolean | undefined {
		return this.acl?.isWriter(peerId);
	}

	values(): T[] {
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
			this.acl?.operations.includes(vertices[0].operation.type) &&
			this.acl?.operations.includes(vertices[0].operation.type)
		) {
			return this.acl.resolveConflicts(vertices);
		}

		if (
			this.operations.includes(vertices[0].operation.type) &&
			this.operations.includes(vertices[0].operation.type)
		) {
			return vertices[0].operation.type === "add"
				? { action: ActionType.DropRight }
				: { action: ActionType.DropLeft };
		}

		return { action: ActionType.Nop };
	}
}
