import { createVerify } from "node:crypto";
import {
	ActionType,
	type DRP,
	type Operation,
	type ResolveConflictsType,
	SemanticsType,
	type Vertex,
} from "@ts-drp/object";
import { AccessControl } from "../AccessControl/index.js";

export class AddWinsSet<T> implements DRP {
	operations: string[] = ["add", "remove"];
	state: Map<T, boolean>;
	permission: AccessControl;
	semanticsType = SemanticsType.pair;

	constructor(admins: string[]) {
		this.permission = new AccessControl(admins);
		this.state = new Map<T, boolean>();
	}

	private _add(value: T): void {
		if (!this.state.get(value)) this.state.set(value, true);
	}

	add(sender: string, signature: string, value: T): void {
		if (!this.permission.isWriter(sender)) {
			throw new Error("Only writers can add values.");
		}
		if (!this._verifySignature(sender, { type: "add", value }, signature)) {
			throw new Error("Invalid signature.");
		}
		this._add(value);
	}

	private _remove(value: T): void {
		if (this.state.get(value)) this.state.set(value, false);
	}

	remove(sender: string, signature: string, value: T): void {
		if (!this.permission.isWriter(sender)) {
			throw new Error("Only writers can remove values.");
		}
		if (!this._verifySignature(sender, { type: "remove", value }, signature)) {
			throw new Error("Invalid signature.");
		}
		this._remove(value);
	}

	grant(sender: string, signature: string, target: string): void {
		if (!this.permission.isAdmin(sender)) {
			throw new Error("Only admins can grant permissions.");
		}
		if (
			!this._verifySignature(
				sender,
				{ type: "grant", value: target },
				signature,
			)
		) {
			throw new Error("Invalid signature.");
		}
		this.permission.grant(target);
	}

	revoke(sender: string, signature: string, target: string): void {
		if (!this.permission.isAdmin(sender)) {
			throw new Error("Only admins can revoke permissions.");
		}
		if (
			!this._verifySignature(
				sender,
				{ type: "revoke", value: target },
				signature,
			)
		) {
			throw new Error("Invalid signature.");
		}
		if (this.permission.isAdmin(target)) {
			throw new Error("Cannot revoke admin permissions.");
		}
		this.permission.revoke(target);
	}

	contains(value: T): boolean {
		return this.state.get(value) === true;
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
			this.permission.operations.includes(vertices[0].operation.type) &&
			this.permission.operations.includes(vertices[0].operation.type)
		) {
			return this.permission.resolveConflicts(vertices);
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

	private _verifySignature(
		sender: string,
		operation: Operation,
		signature: string,
	) {
		const verifier = createVerify("sha256");
		verifier.update(operation.type);
		verifier.update(operation.value);
		verifier.end();
		return verifier.verify(sender, signature, "hex");
	}
}
