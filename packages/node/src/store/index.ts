import type { DRPObject, IDRPObject } from "@ts-drp/object";

export type DRPObjectStoreCallback = (
	objectId: string,
	object: IDRPObject,
) => void;

export class DRPObjectStore {
	// TODO: should be abstracted in handling multiple types of storage
	private _store: Map<string, IDRPObject>;
	private _subscriptions: Map<string, DRPObjectStoreCallback[]>;

	constructor() {
		this._store = new Map<string, DRPObject>();
		this._subscriptions = new Map<string, DRPObjectStoreCallback[]>();
	}

	get(objectId: string): IDRPObject | undefined {
		return this._store.get(objectId);
	}

	put(objectId: string, object: IDRPObject) {
		this._store.set(objectId, object);
		this._notifySubscribers(objectId, object);
	}

	subscribe(objectId: string, callback: DRPObjectStoreCallback): void {
		if (!this._subscriptions.has(objectId)) {
			this._subscriptions.set(objectId, []);
		}
		this._subscriptions.get(objectId)?.push(callback);
	}

	private _notifySubscribers(objectId: string, object: IDRPObject): void {
		const callbacks = this._subscriptions.get(objectId);
		if (callbacks) {
			for (const callback of callbacks) {
				callback(objectId, object);
			}
		}
	}

	remove(objectId: string) {
		this._store.delete(objectId);
	}
}
