import { ActionType, type DRP, type ResolveConflictsType, SemanticsType } from "@ts-drp/object";

export type Identity = {
	peerId: string;
	avatar: string;
};

export class Chat implements DRP {
	semanticsType: SemanticsType = SemanticsType.pair;
	// store messages as strings in the format (timestamp, message, peerId)
	members: Set<Identity>;
	messages: Set<string>;
	constructor() {
		this.messages = new Set<string>();
		this.members = new Set<Identity>();
	}

	addMember(memberPeerId: string, avatar: string): void {
		this.members.add({
			peerId: memberPeerId,
			avatar: avatar,
		});
	}

	getMembers(): Set<Identity> {
		return this.members;
	}

	addMessage(timestamp: string, message: string, peerId: string): void {
		this.messages.add(`(${timestamp}//${message}//${peerId})`);
	}

	query_messages(): Set<string> {
		return this.messages;
	}

	resolveConflicts(_): ResolveConflictsType {
		return { action: ActionType.Nop };
	}
}
