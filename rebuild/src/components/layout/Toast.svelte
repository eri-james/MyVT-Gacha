<script lang="ts">
	import { uiStore } from '$lib/stores';

	const toasts = $derived(uiStore.toasts);
</script>

{#if toasts.length > 0}
	<div class="fixed top-16 right-3 z-[100] flex flex-col gap-2">
		{#each toasts as toast (toast.id)}
			<div
				class="glass-strong px-4 py-2 text-sm rounded-lg animate-slide-up max-w-xs
				{toast.type === 'error'
					? 'border-l-2 border-l-red-500'
					: toast.type === 'success'
						? 'border-l-2 border-l-green-500'
						: 'border-l-2 border-l-blue-500'}"
			>
				{toast.message}
			</div>
		{/each}
	</div>
{/if}
