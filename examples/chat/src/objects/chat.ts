import {
	ActionType,
	type DRP,
	type ResolveConflictsType,
	SemanticsType,
} from "@ts-drp/object";

export class Chat implements DRP {
	semanticsType: SemanticsType = SemanticsType.pair;
	// store messages as strings in the format (timestamp, message, peerId)
	messages: Set<string>;
	constructor() {
		this.messages = new Set<string>();
	}

	addMessage(timestamp: string, message: string, peerId: string): void {
		this.messages.add(`(${timestamp}, ${message}, ${peerId})`);
	}

	query_messages(): Set<string> {
		return this.messages;
	}

	resolveConflicts(_): ResolveConflictsType {
		return { action: ActionType.Nop };
	}
}
