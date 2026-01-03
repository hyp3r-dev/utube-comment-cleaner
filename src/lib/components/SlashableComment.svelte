<script lang="ts">
	import type { YouTubeComment } from '$lib/types/comment';
	import CommentCard from './CommentCard.svelte';
	import SlashAnimation from './SlashAnimation.svelte';

	let {
		comment,
		onSlashComplete
	}: {
		comment: YouTubeComment;
		onSlashComplete?: (commentId: string) => void;
	} = $props();

	let isSlashing = $state(false);
	let isSplit = $state(false);
	let isFadingOut = $state(false);

	export function triggerSlash() {
		isSlashing = true;
	}

	function handleSlashAnimationComplete() {
		// After slash animation, trigger split
		isSplit = true;
		
		// After split animation, fade out
		setTimeout(() => {
			isFadingOut = true;
			
			// Finally, notify parent to remove
			setTimeout(() => {
				onSlashComplete?.(comment.id);
			}, 300);
		}, 400);
	}
</script>

<div 
	class="slashable-comment"
	class:slashing={isSlashing}
	class:split={isSplit}
	class:fading-out={isFadingOut}
>
	{#if isSlashing}
		<SlashAnimation 
			onComplete={handleSlashAnimationComplete}
			direction="right"
		/>
	{/if}
	
	<div class="comment-wrapper">
		<!-- Top half (slides up when split) -->
		<div class="split-top">
			<div class="split-content">
				<CommentCard {comment} />
			</div>
		</div>
		
		<!-- Bottom half (slides down when split) -->
		<div class="split-bottom">
			<div class="split-content">
				<CommentCard {comment} />
			</div>
		</div>
		
		<!-- Original card (visible when not split) -->
		<div class="original-card">
			<CommentCard {comment} />
		</div>
	</div>
</div>

<style>
	.slashable-comment {
		position: relative;
		transition: all 0.3s ease;
	}

	.comment-wrapper {
		position: relative;
	}

	.original-card {
		position: relative;
		z-index: 1;
	}

	.split-top,
	.split-bottom {
		position: absolute;
		left: 0;
		right: 0;
		overflow: hidden;
		opacity: 0;
		pointer-events: none;
		z-index: 2;
	}

	.split-top {
		top: 0;
		height: 50%;
	}

	.split-bottom {
		bottom: 0;
		height: 50%;
	}

	.split-top .split-content {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
	}

	.split-bottom .split-content {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
	}

	/* When split animation triggers */
	.slashable-comment.split .original-card {
		opacity: 0;
	}

	.slashable-comment.split .split-top,
	.slashable-comment.split .split-bottom {
		opacity: 1;
	}

	.slashable-comment.split .split-top {
		animation: splitUp 0.4s ease-out forwards;
	}

	.slashable-comment.split .split-bottom {
		animation: splitDown 0.4s ease-out forwards;
	}

	@keyframes splitUp {
		0% {
			transform: translateY(0) rotate(0deg);
			opacity: 1;
		}
		100% {
			transform: translateY(-20px) rotate(-3deg);
			opacity: 0.8;
		}
	}

	@keyframes splitDown {
		0% {
			transform: translateY(0) rotate(0deg);
			opacity: 1;
		}
		100% {
			transform: translateY(20px) rotate(3deg);
			opacity: 0.8;
		}
	}

	/* Fading out animation */
	.slashable-comment.fading-out {
		animation: fadeAndShrink 0.3s ease-out forwards;
	}

	@keyframes fadeAndShrink {
		0% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(0.8);
			height: 0;
			margin: 0;
			padding: 0;
		}
	}

	/* Slashing state - slight shake */
	.slashable-comment.slashing {
		animation: slashShake 0.2s ease-in-out;
	}

	@keyframes slashShake {
		0%, 100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-3px);
		}
		75% {
			transform: translateX(3px);
		}
	}
</style>
