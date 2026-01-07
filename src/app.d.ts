// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Extend ImportMeta to include our custom environment variable
interface ImportMetaEnv {
	readonly ENABLE_SIMULATION: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

export {};
