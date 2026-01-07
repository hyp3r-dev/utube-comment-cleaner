// Simulation service for testing without real Google/YouTube API
// This module provides mock responses for OAuth and YouTube API calls

import { simulationConfig } from '$lib/server/config';
import enrichmentData from '../../../demodata/enrichment-data.json';

// Type definitions for enrichment data
interface VideoInfo {
	title: string;
	channelId: string;
	channelTitle: string;
	privacyStatus: string;
}

interface SimulatedUser {
	channelId: string;
	channelTitle: string;
	email: string;
}

interface EnrichmentData {
	videos: Record<string, VideoInfo>;
	simulatedUser: SimulatedUser;
	simulatedLikeCounts: Record<string, number>;
}

const data = enrichmentData as EnrichmentData;

// Simulated access token for testing
export const SIMULATED_ACCESS_TOKEN = 'sim_ya29.simulated_access_token_for_testing';

/**
 * Delay helper to simulate network latency
 */
export async function simulateNetworkDelay(): Promise<void> {
	const delay = simulationConfig.networkDelay;
	await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Check if simulation mode is enabled
 */
export function isSimulationEnabled(): boolean {
	return simulationConfig.enabled;
}

/**
 * Get simulated user information
 */
export function getSimulatedUser(): SimulatedUser {
	return data.simulatedUser;
}

/**
 * Get video information for enrichment
 */
export function getVideoInfo(videoId: string): VideoInfo | null {
	return data.videos[videoId] || null;
}

/**
 * Get all video information for multiple video IDs
 */
export function getVideoInfoBatch(videoIds: string[]): Record<string, VideoInfo> {
	const result: Record<string, VideoInfo> = {};
	for (const videoId of videoIds) {
		const info = data.videos[videoId];
		if (info) {
			result[videoId] = info;
		}
	}
	return result;
}

/**
 * Get simulated like count for a comment
 */
export function getSimulatedLikeCount(commentId: string): number {
	return data.simulatedLikeCounts[commentId] || 0;
}

/**
 * Simulate OAuth token exchange response
 */
export interface SimulatedTokenResponse {
	access_token: string;
	expires_in: number;
	token_type: string;
	scope: string;
}

export function getSimulatedTokenResponse(): SimulatedTokenResponse {
	return {
		access_token: SIMULATED_ACCESS_TOKEN,
		expires_in: 3600,
		token_type: 'Bearer',
		scope: 'https://www.googleapis.com/auth/youtube.force-ssl openid email'
	};
}

/**
 * Simulate YouTube channels.list response
 */
export function getSimulatedChannelResponse() {
	const user = getSimulatedUser();
	return {
		items: [{
			id: user.channelId,
			snippet: {
				title: user.channelTitle,
				description: 'Simulated channel for testing'
			}
		}]
	};
}

/**
 * Simulate YouTube comments.list response for enrichment
 */
export function getSimulatedCommentsResponse(commentIds: string[]) {
	const items = commentIds.map(id => ({
		id,
		snippet: {
			textDisplay: 'Simulated comment text',
			textOriginal: 'Simulated comment text',
			authorDisplayName: 'Demo User',
			authorProfileImageUrl: 'https://example.com/avatar.jpg',
			authorChannelUrl: `https://www.youtube.com/channel/${getSimulatedUser().channelId}`,
			likeCount: getSimulatedLikeCount(id),
			publishedAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			canRate: true,
			viewerRating: 'none'
		}
	}));
	
	return { items };
}

/**
 * Simulate YouTube videos.list response
 */
export function getSimulatedVideosResponse(videoIds: string[]) {
	const items = videoIds
		.map(id => {
			const info = getVideoInfo(id);
			if (!info) return null;
			return {
				id,
				snippet: {
					title: info.title,
					channelId: info.channelId,
					channelTitle: info.channelTitle
				},
				status: {
					privacyStatus: info.privacyStatus
				}
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);
	
	return { items };
}

/**
 * Simulate comment deletion (always succeeds in simulation mode)
 */
export function simulateCommentDeletion(commentId: string): { success: boolean; error?: string } {
	// In simulation mode, deletions always succeed
	return { success: true };
}

/**
 * Check if a token is the simulated token
 */
export function isSimulatedToken(token: string): boolean {
	return token === SIMULATED_ACCESS_TOKEN;
}
