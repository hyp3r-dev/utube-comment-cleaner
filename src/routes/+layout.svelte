<script lang="ts">
	import '$lib/styles/global.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
	<title>CommentSweep - Clean Up Your YouTube Comments</title>
	<meta name="description" content="Manage and delete your YouTube comments with ease. Find embarrassing comments, filter by likes, and clean up your digital footprint." />
</svelte:head>

{@render children()}
