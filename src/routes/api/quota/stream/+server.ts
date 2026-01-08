// Server-Sent Events endpoint for real-time quota updates
import type { RequestHandler } from './$types';
import { subscribeToQuotaUpdates, getQuotaStatus, registerUser, type QuotaStatusUpdate } from '$lib/server/quota';
import { oauthConfig } from '$lib/server/config';

export const GET: RequestHandler = async ({ cookies }) => {
	// Only enable SSE if Google Login mode is enabled
	if (!oauthConfig.isConfigured) {
		return new Response('SSE not available - Google Login not configured', { status: 400 });
	}
	
	// Get or create session ID for user tracking
	let sessionId = cookies.get('quota_session');
	if (!sessionId) {
		sessionId = crypto.randomUUID();
		cookies.set('quota_session', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 // 24 hours
		});
	}
	
	// Register user
	registerUser(sessionId);
	
	// Track cleanup resources
	let unsubscribe: (() => void) | null = null;
	let pingInterval: ReturnType<typeof setInterval> | null = null;
	
	// Create a readable stream for SSE
	const stream = new ReadableStream({
		start(controller) {
			// Send initial quota status
			const initialStatus = getQuotaStatus();
			const data = `data: ${JSON.stringify(initialStatus)}\n\n`;
			controller.enqueue(new TextEncoder().encode(data));
			
			// Subscribe to quota updates
			unsubscribe = subscribeToQuotaUpdates((update: QuotaStatusUpdate) => {
				try {
					const eventData = `data: ${JSON.stringify(update)}\n\n`;
					controller.enqueue(new TextEncoder().encode(eventData));
				} catch {
					// Stream closed, cleanup handled by cancel()
				}
			});
			
			// Send keep-alive ping every 30 seconds
			pingInterval = setInterval(() => {
				try {
					controller.enqueue(new TextEncoder().encode(': ping\n\n'));
				} catch {
					// Stream closed, cleanup handled by cancel()
				}
			}, 30000);
		},
		cancel() {
			// Stream cancelled by client - clean up resources
			if (pingInterval) {
				clearInterval(pingInterval);
				pingInterval = null;
			}
			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}
		}
	});
	
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'X-Accel-Buffering': 'no' // Disable nginx buffering
		}
	});
};
