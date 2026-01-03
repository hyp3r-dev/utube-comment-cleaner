import { writable } from 'svelte/store';

export interface Toast {
	id: string;
	type: 'success' | 'error' | 'info' | 'warning';
	message: string;
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function addToast(type: Toast['type'], message: string, duration = 5000): string {
		const id = Math.random().toString(36).slice(2);
		const toast: Toast = { id, type, message, duration };

		update(toasts => [...toasts, toast]);

		if (duration > 0) {
			setTimeout(() => {
				removeToast(id);
			}, duration);
		}

		return id;
	}

	function removeToast(id: string) {
		update(toasts => toasts.filter(t => t.id !== id));
	}

	return {
		subscribe,
		success: (message: string, duration?: number) => addToast('success', message, duration),
		error: (message: string, duration?: number) => addToast('error', message, duration),
		info: (message: string, duration?: number) => addToast('info', message, duration),
		warning: (message: string, duration?: number) => addToast('warning', message, duration),
		remove: removeToast,
		clear: () => update(() => [])
	};
}

export const toasts = createToastStore();
