// Health check endpoint for container orchestration (Docker, Kubernetes, Portainer, etc.)
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json({
		status: 'healthy',
		timestamp: new Date().toISOString(),
		version: '1.0.0'
	});
};
