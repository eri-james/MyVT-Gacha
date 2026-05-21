<script lang="ts">
	import { gameStore } from '$lib/stores';
	import { formatNumber } from '$lib/utils/format';

	const currencies = $derived(gameStore.currencies);
</script>

<div class="fixed top-0 left-0 right-0 z-50 px-3 pt-2 safe-top">
	<div class="glass-strong flex items-center justify-between px-3 py-2 text-xs sm:text-sm">
		<!-- Logo / Title -->
		<div class="flex items-center gap-2">
			<span
				class="font-bold text-sm sm:text-base bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
			>
				MyVT
			</span>
		</div>

		<!-- Currencies -->
		<div class="flex items-center gap-3">
			<!-- VGems -->
			<div class="flex items-center gap-1" title="VGems">
				<span class="text-purple-400">&#9670;</span>
				<span class="text-white font-medium">{formatNumber(currencies.vgems)}</span>
			</div>

			<!-- VRinggit -->
			<div class="flex items-center gap-1" title="VRinggit">
				<span class="text-green-400">&#9679;</span>
				<span class="text-white font-medium">{formatNumber(currencies.vringgit)}</span>
			</div>

			<!-- Blue Tickets -->
			<div class="flex items-center gap-1" title="Blue Tickets">
				<span class="text-blue-400">&#9632;</span>
				<span class="text-white font-medium">{currencies.myTicket.blue}</span>
			</div>

			<!-- LiveCache -->
			<div class="flex items-center gap-1" title="LiveCache">
				<span class="text-cyan-400">&#9654;</span>
				<span class="text-white font-medium">{formatNumber(Math.floor(currencies.liveCache))}</span>
			</div>
		</div>
	</div>
</div>
