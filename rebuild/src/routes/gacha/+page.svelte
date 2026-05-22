<script lang="ts">
	import { onMount } from 'svelte';
	import { gameStore } from '$lib/stores';
	import { gachaStore } from '$lib/stores';
	import { loadCharacters, getImageUrl } from '$lib/data/characters';
	import { calculateRates, selectCharacter, handlePullResult, canPull, deductPullCost, getTicketType, getFeaturedCharacters } from '$lib/logic/gacha';
	import { incrementQuestProgress } from '$lib/logic/quests';
	import { VGEM_PER_TICKET } from '$lib/data/constants';
	import type { PullResult, CharacterRecord, Rarity, BannerType } from '$lib/types';

	let allChars = $state<CharacterRecord[]>([]);
	let featuredChars = $state<CharacterRecord[]>([]);

	const banner = $derived(gachaStore.banner);
	const pityCount = $derived(gameStore.state.pity.count);
	const tickets = $derived(gameStore.currencies.myTicket);
	const vgems = $derived(gameStore.currencies.vgems);
	const totalPulls = $derived(gameStore.state.stats.totalPulls);

	// Current pity-adjusted rates
	let currentRates = $derived(calculateRates(pityCount));

	// Pull cost calculation
	const ticketType = $derived(getTicketType(banner));
	const singleAffordable = $derived(canPull(1, banner, tickets, vgems));
	const multiAffordable = $derived(canPull(10, banner, tickets, vgems));
	const singleCost = $derived(`1 ${ticketType === 'red' ? 'Red' : 'Blue'} Ticket`);
	const multiCost = $derived(`10 ${ticketType === 'red' ? 'Red' : 'Blue'} Tickets`);

	// Featured characters for banner display
	let featuredDisplay: { name: string; slug: string; image: string; rarity: Rarity }[] = $state([]);

	// Pull animation state
	let pulling = $state(false);
	let pullError = $state<string | null>(null);

	async function initChars() {
		allChars = await loadCharacters();
		featuredChars = getFeaturedCharacters(allChars);
		featuredDisplay = featuredChars.map((c) => ({
			name: c.name,
			slug: c.slug,
			image: getImageUrl(c.slug),
			rarity: c.rarity
		}));
	}

	onMount(() => {
		initChars();
	});

	// ── Pull Logic ──
	// All state mutations go through GameStore safe methods.
	// Local variables are used for computation; mutations are applied at the end.

	function doSinglePull(): PullResult[] | null {
		// Snapshot current state into locals — no direct mutations
		let localPity = gameStore.state.pity.count;
		let localSsrStreak = gameStore.state.stats.ssrStreak;

		// Roll rarity (using local pity)
		localPity++;
		const rates = calculateRates(localPity);
		const rand = Math.random();

		let rarity: Rarity = 'R';
		let cumulative = 0;
		for (const r of ['UR', 'SSR', 'SR', 'R'] as const) {
			cumulative += rates[r];
			if (rand < cumulative) {
				rarity = r;
				break;
			}
		}

		// Reset pity on SSR/UR
		if (rarity === 'SSR' || rarity === 'UR') {
			localPity = 0;
			localSsrStreak++;
		} else {
			localSsrStreak = 0;
		}

		// Select character
		const character = selectCharacter(rarity, allChars, banner);
		if (!character) {
			pullError = 'Character data not loaded. Try again.';
			return null;
		}

		// Deduct cost
		const costResult = deductPullCost(1, banner, tickets, vgems);
		if (!costResult) {
			pullError = 'Not enough resources!';
			return null;
		}

		// ── Apply all mutations via safe methods ──

		// Apply cost (must happen before handlePullResult which reads currencies)
		gameStore.addTickets(ticketType, -costResult.ticketsUsed);
		gameStore.addCurrency('vgems', -costResult.vgemsUsed);

		// Handle result (reads current currencies and characters)
		const result = handlePullResult(character, gameStore.characters, gameStore.currencies);

		// Apply pity and pull stats
		gameStore.setPityCount(localPity);
		gameStore.updatePullStats(localSsrStreak);

		// Update character data
		gameStore.setCharacter(character.slug, result.updatedChar);

		// Track pull history
		gameStore.trackPullHistory(character.slug);

		// Quest progress
		gameStore.setQuests(incrementQuestProgress(gameStore.state.quests, 'daily', 'daily_pull_1', 1));

		gameStore.save();

		return [{
			character,
			rarity,
			isNew: result.isNew,
			echo: result.echo,
			liveCacheGained: result.liveCacheGained,
			vgemsBought: costResult.vgemsUsed
		}];
	}

	function doMultiPull(): PullResult[] | null {
		const results: PullResult[] = [];

		// Check affordability first
		if (!canPull(10, banner, tickets, vgems)) {
			pullError = 'Not enough resources!';
			return null;
		}

		// Local tracking — no direct state mutations during pre-roll
		let localPity = gameStore.state.pity.count;
		let localSsrStreak = gameStore.state.stats.ssrStreak;
		let hasSRPlus = false;

		// Track ssrStreak per pull so updatePullStats can be called correctly
		const pullSsrStreaks: number[] = [];

		// Pre-roll all 10
		const preRolls: { rarity: Rarity; character: CharacterRecord }[] = [];

		for (let i = 0; i < 10; i++) {
			let rarity: Rarity = 'R';
			localPity++;
			const rates = calculateRates(localPity);
			const rand = Math.random();

			let cumulative = 0;
			for (const r of ['UR', 'SSR', 'SR', 'R'] as const) {
				cumulative += rates[r];
				if (rand < cumulative) {
					rarity = r;
					break;
				}
			}

			// Guarantee SR+ in 10-pull
			if (i === 9 && !hasSRPlus) {
				rarity = Math.random() < 0.15 ? 'SSR' : 'SR';
			}

			if (rarity === 'SSR' || rarity === 'UR') {
				hasSRPlus = true;
				localPity = 0;
				localSsrStreak++;
			} else {
				localSsrStreak = 0;
			}

			pullSsrStreaks.push(localSsrStreak);

			const character = selectCharacter(rarity, allChars, banner);
			if (!character) {
				pullError = 'Character data not loaded.';
				return null;
			}

			preRolls.push({ rarity, character });
		}

		// Deduct cost (all 10)
		const costResult = deductPullCost(10, banner, tickets, vgems);
		if (!costResult) {
			return null;
		}

		// ── Apply all mutations via safe methods ──

		// Apply cost (must happen before handlePullResult which reads currencies)
		gameStore.addTickets(ticketType, -costResult.ticketsUsed);
		gameStore.addCurrency('vgems', -costResult.vgemsUsed);

		// Process all results
		for (const { rarity, character } of preRolls) {
			const result = handlePullResult(character, gameStore.characters, gameStore.currencies);
			gameStore.setCharacter(character.slug, result.updatedChar);
			gameStore.trackPullHistory(character.slug);

			results.push({
				character,
				rarity,
				isNew: result.isNew,
				echo: result.echo,
				liveCacheGained: result.liveCacheGained
			});
		}

		// Apply pity
		gameStore.setPityCount(localPity);

		// Apply pull stats: call once per pull so totalPulls increments by 10
		// and bestSsrStreak is correctly tracked across all pulls
		for (const streak of pullSsrStreaks) {
			gameStore.updatePullStats(streak);
		}

		gameStore.save();
		return results;
	}

	async function handlePull(isMulti: boolean) {
		if (pulling) return;
		pulling = true;
		pullError = null;

		// Small delay for feel
		await new Promise((r) => setTimeout(r, 300));

		const results = isMulti ? doMultiPull() : doSinglePull();

		if (results) {
			gachaStore.startPull(results);
		}

		pulling = false;
	}

	function formatRate(n: number): string {
		return (n * 100).toFixed(1) + '%';
	}

	function getPityProgress(): number {
		if (pityCount >= 90) return 100;
		if (pityCount >= 40) return 50 + ((pityCount - 40) / 50) * 50;
		return (pityCount / 40) * 50;
	}
</script>

<div class="animate-fade-in">
	<!-- Banner Selection -->
	<div class="glass p-4 rounded-xl mb-4">
		<div class="flex items-center gap-2 mb-3">
			<button
				onclick={() => gachaStore.setBanner('standard')}
				class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
				{banner === 'standard' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'}"
			>
				Standard Banner
			</button>
			<button
				onclick={() => gachaStore.setBanner('featured')}
				class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
				{banner === 'featured' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'}"
			>
				Featured Banner
			</button>
		</div>

		<!-- Featured Characters Display -->
		{#if banner === 'featured' && featuredDisplay.length > 0}
			<div class="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
				<span class="text-xs text-purple-300/70">Rate-up:</span>
				{#each featuredDisplay as char}
					<div class="flex items-center gap-1.5">
						<img
							src={char.image}
							alt={char.name}
							class="w-8 h-8 rounded-full object-cover ring-1 ring-purple-400/50"
							onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
						/>
						<span class="text-xs font-medium text-white/80">{char.name}</span>
					</div>
				{/each}
				<span class="text-xs text-purple-300/50 ml-auto">75% rate-up</span>
			</div>
		{/if}
	</div>

	<!-- Pity Counter -->
	<div class="glass p-4 rounded-xl mb-4">
		<div class="flex items-center justify-between mb-2">
			<span class="text-sm font-semibold text-white/80">Pity Counter</span>
			<span class="text-sm font-mono rarity-text-{banner === 'featured' ? 'UR' : 'SSR'}">
				{pityCount} / 90
			</span>
		</div>
		<div class="w-full h-2 rounded-full bg-white/10 overflow-hidden">
			<div
				class="h-full rounded-full transition-all duration-300 {pityCount >= 75 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : pityCount >= 40 ? 'bg-gradient-to-r from-purple-500 to-pink-400' : 'bg-blue-500/60'}"
				style="width: {getPityProgress()}%"
			></div>
		</div>
		<div class="flex justify-between mt-1.5 text-[10px] text-white/30">
			<span>Soft pity at 40</span>
			<span>Hard pity at 90</span>
		</div>
	</div>

	<!-- Current Rates -->
	<div class="glass p-4 rounded-xl mb-4">
		<div class="text-sm font-semibold text-white/80 mb-3">Current Rates</div>
		<div class="grid grid-cols-4 gap-2 text-center">
			<div class="p-2 rounded-lg bg-white/5">
				<div class="text-lg font-bold text-gray-400">{formatRate(currentRates.R)}</div>
				<div class="text-[10px] text-white/40">R</div>
			</div>
			<div class="p-2 rounded-lg bg-white/5">
				<div class="text-lg font-bold text-blue-400">{formatRate(currentRates.SR)}</div>
				<div class="text-[10px] text-white/40">SR</div>
			</div>
			<div class="p-2 rounded-lg bg-white/5">
				<div class="text-lg font-bold text-purple-400">{formatRate(currentRates.SSR)}</div>
				<div class="text-[10px] text-white/40">SSR</div>
			</div>
			<div class="p-2 rounded-lg bg-white/5">
				<div class="text-lg font-bold text-yellow-400">{formatRate(currentRates.UR)}</div>
				<div class="text-[10px] text-white/40">UR</div>
			</div>
		</div>
	</div>

	<!-- Pull Stats -->
	<div class="flex items-center justify-between px-1 mb-4 text-xs text-white/40">
		<span>Total pulls: {totalPulls}</span>
		<span>SSR streak: {gameStore.state.stats.ssrStreak} (best: {gameStore.state.stats.bestSsrStreak})</span>
	</div>

	<!-- Error -->
	{#if pullError}
		<div class="text-center text-sm text-red-400 mb-3 animate-fade-in">
			{pullError}
		</div>
	{/if}

	<!-- Pull Buttons -->
	<div class="flex gap-3 mb-4">
		<button
			onclick={() => handlePull(false)}
			disabled={!singleAffordable || pulling}
			class="flex-1 py-4 rounded-xl font-bold text-base transition-all
			{singleAffordable && !pulling
				? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-400 hover:to-blue-500 active:scale-95'
				: 'bg-white/5 text-white/20 cursor-not-allowed'}"
		>
			<div class="text-sm opacity-70">Pull x1</div>
			<div class="text-xs opacity-50 mt-0.5">{singleCost}</div>
		</button>

		<button
			onclick={() => handlePull(true)}
			disabled={!multiAffordable || pulling}
			class="flex-[2] py-4 rounded-xl font-bold text-base transition-all
			{multiAffordable && !pulling
				? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400 active:scale-95'
				: 'bg-white/5 text-white/20 cursor-not-allowed'}"
		>
			<div class="text-sm opacity-70">Pull x10</div>
			<div class="text-xs opacity-50 mt-0.5">{multiCost}</div>
		</button>
	</div>

	<!-- VGem conversion note -->
	<div class="text-center text-xs text-white/30 mb-4">
		1 {ticketType === 'red' ? 'Red' : 'Blue'} Ticket = {VGEM_PER_TICKET} VGems
	</div>
</div>

<!-- Pull Reveal Overlay -->
{#if gachaStore.showReveal}
	{@const results = gachaStore.lastPullResults}
	<div class="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
		onclick={() => gachaStore.endReveal()}
		onkeydown={(e) => { if (e.key === 'Escape') gachaStore.endReveal(); }}
	>
		<div class="max-w-sm w-full max-h-[80vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
			{#if results.length === 1}
				<!-- Single pull reveal -->
				<div class="text-center animate-slide-up">
					{#each results as result}
						<div class="glass p-6 rounded-xl rarity-glow-{result.rarity} mb-4">
							<img
								src="/data/portraits/{result.character.slug}.jpg"
								alt={result.character.name}
								class="w-28 h-28 mx-auto rounded-full object-cover ring-3 rarity-border-{result.rarity} mb-3"
								onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
							/>
							<div class="text-xl font-bold rarity-text-{result.rarity}">{result.character.name}</div>
							<div class="text-sm rarity-text-{result.rarity} opacity-70">{result.rarity}{result.isNew ? ' — NEW!' : ` — E${result.echo}`}</div>
						</div>
					{/each}
					<p class="text-xs text-white/40">Tap to continue</p>
				</div>
			{:else}
				<!-- Multi pull reveal -->
				<div class="text-center mb-4 animate-fade-in">
					<h3 class="text-lg font-bold text-white mb-1">10-Pull Results</h3>
					<p class="text-xs text-white/40">Tap to see summary</p>
				</div>
				<div class="grid grid-cols-2 gap-2">
					{#each results as result, i}
						<div
							class="glass p-3 rounded-xl rarity-glow-{result.rarity} animate-slide-up"
							style="animation-delay: {i * 80}ms"
						>
							<img
								src="/data/portraits/{result.character.slug}.jpg"
								alt={result.character.name}
								class="w-14 h-14 mx-auto rounded-full object-cover ring-2 rarity-border-{result.rarity} mb-1.5"
								onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
							/>
							<div class="text-xs font-medium text-white/90 truncate">{result.character.name}</div>
							<div class="flex items-center justify-center gap-1 mt-0.5">
								<span class="text-[10px] rarity-text-{result.rarity}">{result.rarity}</span>
								{#if result.isNew}
									<span class="text-[10px] text-green-400">NEW</span>
								{:else if result.echo > 0}
									<span class="text-[10px] text-purple-400">E{result.echo}</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Pull Summary Overlay -->
{#if gachaStore.showSummary}
	<div class="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
		<div class="glass-strong p-6 rounded-xl max-w-xs w-full animate-slide-up">
			<h3 class="text-lg font-bold text-white text-center mb-4">Pull Summary</h3>

			<div class="space-y-3 mb-5">
				<div class="flex items-center justify-between">
					<span class="text-sm text-white/60">New Characters</span>
					<span class="text-sm font-bold text-green-400">{gachaStore.summaryNewCount}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-white/60">Duplicates (Echo)</span>
					<span class="text-sm font-bold text-purple-400">{gachaStore.summaryEchoCount}</span>
				</div>
				{#if gachaStore.summaryLiveCacheGained > 0}
					<div class="flex items-center justify-between">
						<span class="text-sm text-white/60">LiveCache (E6 overflow)</span>
						<span class="text-sm font-bold text-cyan-400">+{gachaStore.summaryLiveCacheGained}</span>
					</div>
				{/if}
				<div class="flex items-center justify-between">
					<span class="text-sm text-white/60">Best Pull</span>
					<span class="text-sm font-bold rarity-text-{gachaStore.summaryBestRarity.toLowerCase()}">{gachaStore.summaryBestRarity}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-white/60">Pity Count</span>
					<span class="text-sm font-mono text-white/80">{pityCount}</span>
				</div>
			</div>

			<button
				onclick={() => gachaStore.closeSummary()}
				class="w-full py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
			>
				Continue
			</button>
		</div>
	</div>
{/if}
