import {
	ActionType,
	type DRP,
	type ResolveConflictsType,
	SemanticsType,
	Vertex,
} from "@ts-drp/object";

export type Message = {
	timestamp: string;
	content: string;
	peerId: string;
	role: Role;
};

export enum Role {
	User = 0,
	Assistant = 1,
}

export class Chat implements DRP {
	semanticsType: SemanticsType = SemanticsType.pair;
	// store messages as strings in the format (timestamp, message, peerId)
	members: Set<string>;
	messages: Set<Message>;
	constructor() {
		this.messages = new Set<Message>();
		this.members = new Set<string>();
	}

	addMember(memberPeerId: string): void {
		this.members.add(memberPeerId);
	}

	getMembers(): Set<string> {
		return this.members;
	}

	addMessage(timestamp: string, message: string, peerId: string, role: Role): void {
		this.messages.add({ timestamp, content: message, peerId, role });
	}

	query_messages(): Set<Message> {
		return this.messages;
	}

	resolveConflicts(_: Vertex[]): ResolveConflictsType {
		return { action: ActionType.Nop };
	}
}
