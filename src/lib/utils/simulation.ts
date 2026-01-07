// Client-side simulation utilities for testing
// This module provides utilities to detect and handle simulation mode in the browser
// NOTE: This code is tree-shaken in production builds when ENABLE_SIMULATION_MODE is not set

// Compile-time check - allows dead code elimination in production
// When this is false at build time, the bundler will remove all simulation code
const SIMULATION_ENABLED = import.meta.env.ENABLE_SIMULATION;

// Check if we're using a simulated token
// In production builds (SIMULATION_ENABLED=false), this always returns false
// allowing the bundler to eliminate simulation code paths
export function isSimulatedToken(token: string): boolean {
	if (!SIMULATION_ENABLED) return false;
	return token.startsWith('sim_');
}

// All simulation data is wrapped in a getter that returns null when simulation is disabled
// This allows the bundler to tree-shake the data in production builds
function getSimulationData() {
	if (!SIMULATION_ENABLED) return null;
	
	return {
		videos: {
			"cX_uOoBhxqI": { title: "The Future of Open Source Phones - Can Anyone Crack the Code?", channelId: "UCBcRF18a7Qf58cCRy5xuWwQ", channelTitle: "TechLinked", privacyStatus: "public" },
			"OgMdO0ckICg": { title: "Building a DIY Smartphone from Scratch", channelId: "UCBcRF18a7Qf58cCRy5xuWwQ", channelTitle: "TechLinked", privacyStatus: "public" },
			"v9eC7USofVA": { title: "Best Camera Drones Under $500 - 2025 Edition", channelId: "UCddiUEpeqJcYeBxX1IVBKvQ", channelTitle: "DroneReview", privacyStatus: "public" },
			"pwgAyXH692w": { title: "Why Car Subscriptions Are Getting Out of Hand", channelId: "UCXGgrKt94gR6lmN4aN3mYTg", channelTitle: "Donut Media", privacyStatus: "public" },
			"dQw4w9WgXcQ": { title: "Rick Astley - Never Gonna Give You Up (Official Music Video)", channelId: "UCuAXFkgsw1L7xaCfnd5JJOw", channelTitle: "Rick Astley", privacyStatus: "public" },
			"a3ICNMQW7Ok": { title: "React Hooks Explained - Complete Tutorial 2025", channelId: "UCW5YeuERMmlnqo4oq8vwUpg", channelTitle: "Net Ninja", privacyStatus: "public" },
			"kJQP7kiw5Fk": { title: "Luis Fonsi - Despacito ft. Daddy Yankee", channelId: "UCLp8RBhQHu9wSsq62j_Md6A", channelTitle: "Luis Fonsi", privacyStatus: "public" },
			"hY7m5jjJ9mM": { title: "Climate Change: The Science Explained", channelId: "UC6107grRI4m0o2-emgoDnAA", channelTitle: "SciShow", privacyStatus: "public" },
			"9bZkp7q19f0": { title: "PSY - GANGNAM STYLE(강남스타일) M/V", channelId: "UCrDkAvwZum-UTjHmzDI2iIw", channelTitle: "officialpsy", privacyStatus: "public" },
			"FTQbiNvZqaY": { title: "Machine Learning Fundamentals - Complete Course", channelId: "UCCezIgC97PvUuR4_gbFUs5g", channelTitle: "Corey Schafer", privacyStatus: "public" },
			"JGwWNGJdvx8": { title: "Ed Sheeran - Shape of You [Official Video]", channelId: "UC0C-w0YjGpqDXGB8IHb662A", channelTitle: "Ed Sheeran", privacyStatus: "public" },
			"L_jWHffIx5E": { title: "Smash Mouth - All Star (Official Music Video)", channelId: "UCpOC4X_hxs35RHOL2Aav9mQ", channelTitle: "Smash Mouth", privacyStatus: "public" },
			"fJ9rUzIMcZQ": { title: "Gordon Ramsay's Ultimate Guide to Pasta", channelId: "UCIEv3lZ_tNXHzL3ox-_uUGQ", channelTitle: "Gordon Ramsay", privacyStatus: "public" },
			"RgKAFK5djSk": { title: "Wiz Khalifa - See You Again ft. Charlie Puth [Official Video]", channelId: "UC3SEvBYhullC-aaEmbEUplA", channelTitle: "Wiz Khalifa", privacyStatus: "public" },
			"OPf0YbXqDm0": { title: "The Great Debate: Was This Theory Wrong All Along?", channelId: "UCsXVk37bltHxD1rDPwtNM8Q", channelTitle: "Kurzgesagt – In a Nutshell", privacyStatus: "public" },
			"M7lc1UVf-VE": { title: "How YouTube's Algorithm Actually Works in 2025", channelId: "UCZaT_X_mc0BI-djXOlfhqWQ", channelTitle: "VICE", privacyStatus: "public" },
			"QH2-TGUlwu4": { title: "Quantum Computing: A Complete Explanation", channelId: "UCsooa4yRKGN_zEE8iknghZA", channelTitle: "TED-Ed", privacyStatus: "public" },
			"y6120QOlsfU": { title: "The Internet's Best Memes Explained", channelId: "UCX6OQ3DkcsbYNE6H8uQQuVA", channelTitle: "MrBeast", privacyStatus: "public" },
			"LXb3EKWsInQ": { title: "World's Most Dangerous Jobs", channelId: "UC4USoIAL9qcsx5nCZV_QRnA", channelTitle: "Discovery", privacyStatus: "public" },
			"CevxZvSJLk8": { title: "Planet Earth III - Official 4K Trailer", channelId: "UCwmZiChSryoWQCZMIQezgTg", channelTitle: "BBC", privacyStatus: "public" },
			"pRpeEdMmmQ0": { title: "Honest Product Reviews: When Ads Go Too Far", channelId: "UCXuqSBlHAE6Xw-yeJA0Tunw", channelTitle: "Linus Tech Tips", privacyStatus: "public" },
			"2Vv-BfVoq4g": { title: "Avengers: Endgame - All Easter Eggs Explained", channelId: "UCq-Fj5jknLsUf-MWSy4_brA", channelTitle: "Screen Rant", privacyStatus: "public" },
			"YQHsXMglC9A": { title: "Adele - Hello (Official Music Video)", channelId: "UCsRM0YB_dabtEPGPTKo-gcw", channelTitle: "Adele", privacyStatus: "public" },
			"kXYiU_JCYtU": { title: "Calculus Made Easy - Full Course", channelId: "UCYO_jab_esuFRV4b17AJtAw", channelTitle: "3Blue1Brown", privacyStatus: "public" },
			"hT_nvWreIhg": { title: "The Ultimate Sleep Documentary", channelId: "UC-lHJZR3Gqxm24_Vd_AJ5Yw", channelTitle: "PewDiePie", privacyStatus: "public" },
			"iik25wqIuFo": { title: "Behind the Scenes: Movie Magic", channelId: "UCY1kMZp36IQSyNx_9h4mpCg", channelTitle: "Mark Rober", privacyStatus: "public" },
			"oHg5SJYRHA0": { title: "RickRoll'D", channelId: "UCYVCgpVmQSVtVJ-w5LbgYYg", channelTitle: "cotter548", privacyStatus: "public" },
			"Zi_XLOBDo_Y": { title: "Original vs Remake: Which is Better?", channelId: "UCsvn_Po0SmunchJYOWpOxMg", channelTitle: "CinemaSins", privacyStatus: "public" },
			"aJOTlE1K90k": { title: "TikTok's Viral Moments of 2025", channelId: "UCVHFbqXqoYvEWM1Ddxl0QKg", channelTitle: "TikTok", privacyStatus: "public" }
		} as Record<string, { title: string; channelId: string; channelTitle: string; privacyStatus: string }>,
		likes: {
			"UgziaREDrqFwjhBz_w14AaABAg": 12,
			"UgwTfH6bKCr_-YW9Ot94AaABAg": 47,
			"UgxLU9ZLaoTdSOKvNYJ4AaABAg": 8,
			"Ugwm1x6dlafPur36gWV4AaABAg": 156,
			"UgxKL5aMnP8tXcR_qA94AaABAg": 2341,
			"UgwPq7hNbR2sT_wL1xJ4AaABAg": 5,
			"UgzRw9mK5xLpYaB_cT14AaABAg": 89,
			"UgxTm4nWqR8vZd_hNp94AaABAg": 23,
			"UgwYk6pBnS1tQe_mRa14AaABAg": 1024,
			"UgxVn3qCmT7uPg_jLb94AaABAg": 67,
			"UgwZo8rDnU9vRh_kMc14AaABAg": 234,
			"UgxAp1sFoV2wSi_lNd94AaABAg": 45,
			"UgwBq2tGoW3xTj_mOe14AaABAg": 512,
			"UgxCr3uHpX4yUk_nPf94AaABAg": 189,
			"UgwDs4vIqY5zVl_oQg14AaABAg": 34,
			"UgxEt5wJrZ6AWm_pRh94AaABAg": 78,
			"UgwFu6xKsA7BXn_qSi14AaABAg": 145,
			"UgxGv7yLtB8CYo_rTj94AaABAg": 567,
			"UgwHw8zMuC9DZp_sUk14AaABAg": 23,
			"UgxIx9ANvD0EAq_tVl94AaABAg": 901,
			"UgwJy0BOxE1FBr_uWm14AaABAg": 12,
			"UgxKz1CPyF2GCs_vXn94AaABAg": 445,
			"UgwLA2DQzG3HDt_wYo14AaABAg": 678,
			"UgxMB3ERAaIJE_xZp94AaABAg": 1567,
			"UgwNC4FSBbJKF_yAq14AaABAg": 234,
			"UgxOD5GTCcKLG_zBr94AaABAg": 89,
			"UgwPE6HUDdLMH_0Cs14AaABAg": 123,
			"UgxQF7IVEeMNI_1Dt94AaABAg": 456,
			"UgwRG8JWFfNOJ_2Eu14AaABAg": 34,
			"UgxSH9KXGgOPK_3Fv94AaABAg": 789
		} as Record<string, number>,
		user: {
			channelId: "UCJoxVQaL9vCw2DVWE2jDYjw",
			channelTitle: "Demo User Channel"
		}
	};
}

// Simulated user info - returns empty object in production for type safety
export const SIMULATED_USER = SIMULATION_ENABLED 
	? { channelId: "UCJoxVQaL9vCw2DVWE2jDYjw", channelTitle: "Demo User Channel" }
	: { channelId: "", channelTitle: "" };

/**
 * Get simulated video info for enrichment
 * Returns null in production builds
 */
export function getSimulatedVideoInfo(videoId: string) {
	const data = getSimulationData();
	if (!data) return null;
	return data.videos[videoId] || null;
}

/**
 * Get simulated like count for a comment
 * Returns 0 in production builds
 */
export function getSimulatedLikeCount(commentId: string): number {
	const data = getSimulationData();
	if (!data) return 0;
	return data.likes[commentId] || Math.floor(Math.random() * 100);
}

/**
 * Simulate network delay
 * No-op in production builds
 */
export async function simulateDelay(ms: number = 300): Promise<void> {
	if (!SIMULATION_ENABLED) return;
	await new Promise(resolve => setTimeout(resolve, ms));
}
