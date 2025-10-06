/* eslint-disable @typescript-eslint/no-explicit-any */
export type Listener<T = any> = (payload: T) => void;

export class EventEmitter<TEvents extends Record<string, any> = any> {
	private listeners: Record<string, Listener[]> = {};

	subscribe<K extends keyof TEvents & string>(eventName: K, callback: Listener<TEvents[K]>) {
		(this.listeners[eventName] ||= []).push(callback as Listener);
	}

	unsubscribe<K extends keyof TEvents & string>(eventName: K, callback: Listener<TEvents[K]>) {
		const arr = this.listeners[eventName];
		if (!arr) return;
		this.listeners[eventName] = arr.filter((fn) => fn !== (callback as Listener));
	}

	notify<K extends keyof TEvents & string>(eventName: K, payload: TEvents[K]) {
		const arr = this.listeners[eventName];
		if (!arr) return;
		arr.forEach((fn) => fn(payload));
	}
}
