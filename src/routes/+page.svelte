<script>
 import { isAuthenticated } from '$lib/stores/auth';
 import LandingExperience from '$lib/components/landing/LandingExperience.svelte';
 import Today from './today/+page.svelte';
</script>
<svelte:head><title>NioSports Pro · Deportes, análisis y bankroll</title></svelte:head>
{#if $isAuthenticated}<Today/>{:else}<LandingExperience/>{/if}
