import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		// Compile-time constant for simulation mode
		// When false, dead code elimination will remove simulation code from production builds
		'import.meta.env.ENABLE_SIMULATION': JSON.stringify(process.env.ENABLE_SIMULATION_MODE === 'true')
	}
});
