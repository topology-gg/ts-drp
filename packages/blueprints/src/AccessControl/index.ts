import { createVerify } from "node:crypto";

import {
	ActionType,
	type DRP,
	type Operation,
	type ResolveConflictsType,
	SemanticsType,
	type Vertex,
} from "@ts-drp/object";

export enum AccessControlConflictResolution {
	GrantWins = 0,
	RevokeWins = 1,
}

export class AccessControl implements DRP {
	operations: string[] = ["grant", "revoke"];
	semanticsType = SemanticsType.pair;

	private _conflictResolution: AccessControlConflictResolution;
	private _admins: Set<string>;
	private _writers: Set<string>;

	constructor(
		admins: string[],
		conflictResolution?: AccessControlConflictResolution,
	) {
		this._admins = new Set(admins);
		this._writers = new Set(admins);
		this._conflictResolution =
			conflictResolution ?? AccessControlConflictResolution.RevokeWins;
	}

	private _grant(invoker: string): void {
		this._writers.add(invoker);
	}

	grant(sender: string, signature: string, invoker: string): void {
		if (!this.isAdmin(sender)) {
			throw new Error("Only admins can grant permissions.");
		}
		if (
			!this._verifySignature(
				sender,
				{ type: "grant", value: invoker },
				signature,
			)
		) {
			throw new Error("Invalid signature.");
		}
		this._grant(invoker);
	}

	private _revoke(invoker: string): void {
		this._writers.delete(invoker);
	}

	revoke(sender: string, signature: string, invoker: string): void {
		if (!this.isAdmin(sender)) {
			throw new Error("Only admins can revoke permissions.");
		}
		if (
			!this._verifySignature(
				sender,
				{ type: "revoke", value: invoker },
				signature,
			)
		) {
			throw new Error("Invalid signature.");
		}
		if (this.isAdmin(invoker))
			throw new Error(
				"Cannot revoke permissions from a node with admin privileges.",
			);
		this._revoke(invoker);
	}

	isAdmin(publicKey: string): boolean {
		return this._admins.has(publicKey);
	}

	isWriter(publicKey: string): boolean {
		return this._writers.has(publicKey);
	}

	resolveConflicts(vertices: Vertex[]): ResolveConflictsType {
		if (!vertices[0].operation || !vertices[1].operation)
			return { action: ActionType.Nop };
		if (
			vertices[0].operation.type === vertices[1].operation.type ||
			vertices[0].operation.value !== vertices[1].operation.value
		)
			return { action: ActionType.Nop };

		return this._conflictResolution ===
			AccessControlConflictResolution.GrantWins
			? {
					action:
						vertices[0].operation.type === "grant"
							? ActionType.DropRight
							: ActionType.DropLeft,
				}
			: {
					action:
						vertices[0].operation.type === "grant"
							? ActionType.DropLeft
							: ActionType.DropRight,
				};
	}

	private _verifySignature(
		sender: string,
		operation: Operation,
		signature: string,
	): boolean {
		if (!this.isWriter(sender)) return false;
		const verifier = createVerify("sha256");
		verifier.update(operation.type);
		verifier.update(operation.value);
		verifier.end();
		return verifier.verify(sender, signature, "hex");
	}
}
