<script lang="ts">
        import type { ExcursionEvent, ExcursionChoiceType } from '$lib/types';

        interface Props {
                event: ExcursionEvent;
                onchoose: (type: ExcursionChoiceType) => void;
        }

        let { event, onchoose }: Props = $props();

        let selected = $state<ExcursionChoiceType | null>(null);

        function selectChoice(type: ExcursionChoiceType) {
                selected = type;
                // Brief delay for feedback
                setTimeout(() => {
                        onchoose(type);
                }, 300);
        }

        function getChoiceStyle(type: ExcursionChoiceType): string {
                if (type === 'tryhard') return 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-300';
                if (type === 'normal') return 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-300';
                return 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-300';
        }

        function getChoiceIcon(type: ExcursionChoiceType): string {
                if (type === 'tryhard') return '🔥';
                if (type === 'normal') return '📝';
                return '😌';
        }
</script>

<div class="glass p-4 rounded-xl animate-slide-up">
        <!-- Event Header -->
        <div class="text-center mb-4">
                <div class="text-[10px] text-white/30 mb-1">Cycle {1 + ['mg', 'vc', 'tc', 'ch'].indexOf(event.focusStat)} Excursion</div>
                <div class="text-lg font-bold text-white mb-1">{event.title}</div>
                <p class="text-xs text-white/50 px-2">{event.description}</p>
        </div>

        <!-- Choices -->
        <div class="flex flex-col gap-2">
                {#each event.choices as choice (choice.type)}
                        <button
                                onclick={() => selectChoice(choice.type)}
                                disabled={selected !== null}
                                class="p-3 rounded-xl border text-left transition-all duration-200
                                {selected === choice.type
                                        ? getChoiceStyle(choice.type) + ' ring-2 ring-white/30 scale-[0.98]'
                                        : selected !== null
                                                ? 'opacity-30 cursor-not-allowed bg-white/3 border-white/5'
                                                : getChoiceStyle(choice.type) + ' active:scale-[0.97]'}"
                        >
                                <div class="flex items-center gap-2 mb-1">
                                        <span class="text-base">{getChoiceIcon(choice.type)}</span>
                                        <span class="text-sm font-bold">{choice.label}</span>
                                </div>
                                <p class="text-[10px] text-white/50 mb-1.5">{choice.description}</p>
                                <div class="flex gap-3 text-[10px]">
                                        <span class="text-white/40">
                                                +{choice.statGain} {event.focusStat.toUpperCase()}
                                        </span>
                                        <span class="{choice.psCost > 0 ? 'text-green-400' : 'text-red-400'}">
                                                {choice.psCost > 0 ? '+' : ''}{choice.psCost} PS
                                        </span>
                                        {#if choice.subGain > 0}
                                                <span class="text-purple-400">+{choice.subGain} subs</span>
                                        {/if}
                                </div>
                        </button>
                {/each}
        </div>
</div>
