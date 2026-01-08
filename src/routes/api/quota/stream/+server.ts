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
	
	// Create a readable stream for SSE
	const stream = new ReadableStream({
		start(controller) {
			// Send initial quota status
			const initialStatus = getQuotaStatus();
			const data = `data: ${JSON.stringify(initialStatus)}\n\n`;
			controller.enqueue(new TextEncoder().encode(data));
			
			// Subscribe to quota updates
			const unsubscribe = subscribeToQuotaUpdates((update: QuotaStatusUpdate) => {
				try {
					const eventData = `data: ${JSON.stringify(update)}\n\n`;
					controller.enqueue(new TextEncoder().encode(eventData));
				} catch {
					// Stream closed, cleanup
					unsubscribe();
				}
			});
			
			// Send keep-alive ping every 30 seconds
			const pingInterval = setInterval(() => {
				try {
					controller.enqueue(new TextEncoder().encode(': ping\n\n'));
				} catch {
					clearInterval(pingInterval);
					unsubscribe();
				}
			}, 30000);
			
			// Cleanup on close
			return () => {
				clearInterval(pingInterval);
				unsubscribe();
			};
		},
		cancel() {
			// Stream cancelled by client
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
