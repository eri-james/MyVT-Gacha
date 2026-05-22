<script lang="ts">
	import type { CharacterRecord, CharacterData, Rarity } from '$lib/types';
	import { getImageUrl } from '$lib/data/characters';

	interface Props {
		character: CharacterRecord;
		charData?: CharacterData | null;
		compact?: boolean;
		showStats?: boolean;
		onClick?: () => void;
		class?: string;
	}

	let { character, charData = null, compact = false, showStats = false, onClick, class: className = '' }: Props = $props();

	const rarityClass: Record<Rarity, string> = {
		R: 'rarity-border-R',
		SR: 'rarity-border-SR',
		SSR: 'rarity-border-SSR',
		UR: 'rarity-border-UR'
	};

	const rarityGlow: Record<Rarity, string> = {
		R: 'rarity-glow-R',
		SR: 'rarity-glow-SR',
		SSR: 'rarity-glow-SSR',
		UR: 'rarity-glow-UR'
	};

	const rarityBg: Record<Rarity, string> = {
		R: 'rarity-bg-R',
		SR: 'rarity-bg-SR',
		SSR: 'rarity-bg-SSR',
		UR: 'rarity-bg-UR'
	};

	const rarityLabel: Record<Rarity, string> = {
		R: 'R',
		SR: 'SR',
		SSR: 'SSR',
		UR: 'UR'
	};

	const stats = $derived(charData?.stats ?? character.stats);
	const level = $derived(charData?.level ?? 1);
	const echo = $derived(charData?.echo ?? 0);
</script>

<!-- Full card mode -->
{#if !compact}
	<button
		onclick={onClick}
		class="relative group flex flex-col items-center p-3 rounded-xl transition-all duration-200 hover:scale-[1.02] {className}
		{rarityBg[character.rarity]} border-2 {rarityClass[character.rarity]} {rarityGlow[character.rarity]}"
	>
		<!-- Rarity badge -->
		<div class="absolute top-2 right-2 text-xs font-bold opacity-80 {rarityClass[character.rarity].replace('border-', 'text-')}">
			{rarityLabel[character.rarity]}
		</div>

		<!-- Portrait -->
		<div class="relative w-20 h-20 sm:w-24 sm:h-24 mb-2">
			<img
				src={getImageUrl(character.slug)}
				alt={character.name}
				class="w-full h-full rounded-full object-cover ring-2 {rarityClass[character.rarity]}"
				onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
			/>
		</div>

		<!-- Name & Info -->
		<div class="text-center">
			<div class="text-sm font-semibold text-white truncate max-w-[100px]">{character.name}</div>
			<div class="text-xs text-white/50">{character.agency}</div>
			{#if charData?.owned}
				<div class="flex items-center justify-center gap-2 mt-1 text-xs text-white/40">
					<span>Lv.{level}</span>
					{#if echo > 0}
						<span class="text-purple-400">E{echo}</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Stats (optional) -->
		{#if showStats && stats}
			<div class="mt-2 grid grid-cols-3 gap-1 text-center">
				<div class="flex flex-col">
					<span class="text-[10px] text-green-400">ST</span>
					<span class="text-xs text-white/80">{stats.st}</span>
				</div>
				<div class="flex flex-col">
					<span class="text-[10px] text-orange-400">PS</span>
					<span class="text-xs text-white/80">{stats.ps}</span>
				</div>
				<div class="flex flex-col">
					<span class="text-[10px] text-blue-400">TC</span>
					<span class="text-xs text-white/80">{stats.tc}</span>
				</div>
				<div class="flex flex-col">
					<span class="text-[10px] text-red-400">CH</span>
					<span class="text-xs text-white/80">{stats.ch}</span>
				</div>
				<div class="flex flex-col">
					<span class="text-[10px] text-cyan-400">VC</span>
					<span class="text-xs text-white/80">{stats.vc}</span>
				</div>
				<div class="flex flex-col">
					<span class="text-[10px] text-yellow-400">MG</span>
					<span class="text-xs text-white/80">{stats.mg}</span>
				</div>
			</div>
		{/if}
	</button>

<!-- Compact mode (list/horizontal) -->
{:else}
	<button
		onclick={onClick}
		class="relative flex items-center gap-3 p-2 rounded-lg transition-all duration-200 hover:bg-white/5 {className}
		{rarityBg[character.rarity]} border border-white/5"
	>
		<!-- Portrait -->
		<img
			src={getImageUrl(character.slug)}
			alt={character.name}
			class="w-10 h-10 rounded-full object-cover flex-shrink-0"
			onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
		/>

		<!-- Info -->
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-white truncate">{character.name}</span>
				<span class="text-xs font-bold {rarityClass[character.rarity].replace('border-', 'text-')}">{rarityLabel[character.rarity]}</span>
			</div>
			{#if charData?.owned}
				<div class="text-xs text-white/40">Lv.{level}{echo > 0 ? ` E${echo}` : ''}</div>
			{/if}
		</div>
	</button>
{/if}
