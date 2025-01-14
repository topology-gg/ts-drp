import type { DRPObject } from "@ts-drp/object";

export type DRPObjectStoreCallback = (
	objectId: string,
	object: DRPObject,
) => void | Promise<void>;

export class DRPObjectStore {
	// TODO: should be abstracted in handling multiple types of storage
	private _store: Map<string, DRPObject>;
	private _subscriptions: Map<string, DRPObjectStoreCallback[]>;
	private _putCallback: (objectId: string) => void | Promise<void>;
	private _removeCallback: (objectId: string) => void | Promise<void>;

	constructor({
		putCallback = () => {},
		removeCallback = () => {},
	}: {
		putCallback?: (objectId: string) => void | Promise<void>;
		removeCallback?: (objectId: string) => void | Promise<void>;
	} = {}) {
		this._store = new Map<string, DRPObject>();
		this._subscriptions = new Map<string, DRPObjectStoreCallback[]>();
		this._putCallback = putCallback;
		this._removeCallback = removeCallback;
	}

	get(objectId: string): DRPObject | undefined {
		return this._store.get(objectId);
	}

	async put(objectId: string, object: DRPObject) {
		if (!this._store.has(objectId)) {
			await this._putCallback(objectId);
		}
		this._store.set(objectId, object);
		await this._notifySubscribers(objectId, object);
	}

	subscribe(objectId: string, callback: DRPObjectStoreCallback): void {
		if (!this._subscriptions.has(objectId)) {
			this._subscriptions.set(objectId, []);
		}
		this._subscriptions.get(objectId)?.push(callback);
	}

	private async _notifySubscribers(
		objectId: string,
		object: DRPObject,
	): Promise<void> {
		const callbacks = this._subscriptions.get(objectId);
		if (callbacks) {
			for (const callback of callbacks) {
				await callback(objectId, object);
			}
		}
	}

	async remove(objectId: string) {
		this._store.delete(objectId);
		await this._removeCallback(objectId);
	}
}
