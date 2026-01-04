<script lang="ts">
	import '$lib/styles/global.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>CommentSlash - Destroy Your YouTube Comments</title>
	<meta name="description" content="Manage and delete your YouTube comments with precision. Find embarrassing comments, filter by likes, and slash your digital footprint." />
</svelte:head>

{@render children()}
