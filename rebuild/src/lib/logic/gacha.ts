// ─── Gacha Logic ───────────────────────────────────────
// Pure functions for gacha pull mechanics.
// No DOM, no store dependencies — fully unit-testable.

import type { CharacterRecord, CharacterData, Rarity, GachaRates, PullResult, BannerType } from '$lib/types';
import {
        BASE_RATES, SOFT_PITY_SSR, SOFT_PITY_UR, HARD_PITY,
        FEATURED_CHARACTERS, FEATURED_RATE_UP,
        ECHO_MAX, ECHO_GAINS, E6_LIVECACHE, RARITY_MULTIPLIERS,
        VGEM_PER_TICKET
} from '$lib/data/constants';

// ── Pity System ──

export function calculateRates(pityCount: number): GachaRates {
        if (pityCount >= HARD_PITY) {
                return { R: 0, SR: 0, SSR: 0.50, UR: 0.50 };
        }

        let ssrRate = BASE_RATES.SSR;
        let urRate = BASE_RATES.UR;

        // Soft pity: linearly increase SSR/UR rates
        if (pityCount >= SOFT_PITY_SSR) {
                const progress = Math.min(1, (pityCount - SOFT_PITY_SSR) / (HARD_PITY - SOFT_PITY_SSR));
                ssrRate += progress * 0.50;
        }
        if (pityCount >= SOFT_PITY_UR) {
                const progress = Math.min(1, (pityCount - SOFT_PITY_UR) / (HARD_PITY - SOFT_PITY_UR));
                urRate += progress * 0.15;
        }

        const srRate = BASE_RATES.SR;
        const rRate = Math.max(0, 1 - srRate - ssrRate - urRate);

        return { R: rRate, SR: srRate, SSR: ssrRate, UR: urRate };
}

// ── Character Selection ──

export function selectCharacter(
        rarity: Rarity,
        allChars: CharacterRecord[],
        banner: BannerType
): CharacterRecord | null {
        const pool = allChars.filter((c) => c.rarity === rarity);
        if (pool.length === 0) return null;

        // Featured banner rate-up
        if (banner === 'featured') {
                const featuredInRarity = FEATURED_CHARACTERS.filter((slug) => {
                        const c = allChars.find((ch) => ch.slug === slug);
                        return c && c.rarity === rarity;
                });

                if (featuredInRarity.length > 0 && Math.random() < FEATURED_RATE_UP) {
                        const slug = featuredInRarity[Math.floor(Math.random() * featuredInRarity.length)];
                        return allChars.find((c) => c.slug === slug) ?? null;
                }
        }

        return pool[Math.floor(Math.random() * pool.length)];
}

// ── Echo & Dupe Handling ──

export function handlePullResult(
        character: CharacterRecord,
        characters: Record<string, CharacterData>,
        currencies: { liveCache: number }
): { isNew: boolean; echo: number; liveCacheGained: number; updatedChar: CharacterData } {
        const slug = character.slug;
        const rarity = character.rarity;

        if (!characters[slug] || !characters[slug].owned) {
                // New character
                const charData: CharacterData = {
                        owned: true,
                        rarity,
                        echo: 0,
                        level: 1,
                        stats: { ...character.stats },
                        baseStats: { ...character.stats },
                        variants: mapRarityToVariants(rarity),
                        shards: 0,
                        bondPoints: 0,
                        bondLevel: 0,
                        lastDateCooldown: 0,
                        lastStaminaRecovery: Date.now()
                };
                return { isNew: true, echo: 0, liveCacheGained: 0, updatedChar: charData };
        }

        const charData = { ...characters[slug], variants: [...characters[slug].variants] };

        if (charData.echo < ECHO_MAX) {
                // Add Echo
                charData.echo++;
                const gains = ECHO_GAINS[rarity] || ECHO_GAINS.R;
                charData.stats = { ...charData.stats };
                charData.stats.st += gains.primary;
                charData.stats.ps += gains.primary;
                charData.stats.tc += gains.secondary;
                charData.stats.ch += gains.secondary;
                charData.stats.vc += gains.secondary;
                charData.stats.mg += gains.secondary;

                // Update baseStats max cap
                if (charData.baseStats) {
                        charData.baseStats = { ...charData.baseStats };
                        charData.baseStats.st = charData.stats.st;
                        charData.baseStats.ps = charData.stats.ps;
                }
                return { isNew: false, echo: charData.echo, liveCacheGained: 0, updatedChar: charData };
        }

        // E6 MAX — convert to LiveCache
        const lc = E6_LIVECACHE[rarity] || 20;
        return { isNew: false, echo: ECHO_MAX, liveCacheGained: lc, updatedChar: charData };
}

function mapRarityToVariants(rarity: Rarity): string[] {
        switch (rarity) {
                case 'UR': return ['ur'];
                case 'SSR': return ['ssr'];
                case 'SR': return ['sr'];
                default: return ['r'];
        }
}

// ── Cost Logic ──

export function getTicketType(banner: BannerType): 'blue' | 'red' {
        return banner === 'featured' ? 'red' : 'blue';
}

export function canPull(
        count: number,
        banner: BannerType,
        tickets: { blue: number; red: number },
        vgems: number
): boolean {
        const type = getTicketType(banner);
        const available = tickets[type] || 0;
        const deficit = Math.max(0, count - available);
        return available >= count || vgems >= deficit * VGEM_PER_TICKET;
}

export function deductPullCost(
        count: number,
        banner: BannerType,
        tickets: { blue: number; red: number },
        vgems: number
): { ticketsUsed: number; vgemsUsed: number } | null {
        const type = getTicketType(banner);
        const available = tickets[type] || 0;

        if (available >= count) {
                return { ticketsUsed: count, vgemsUsed: 0 };
        }

        const deficit = count - available;
        const vgemsNeeded = deficit * VGEM_PER_TICKET;
        if (vgems < vgemsNeeded) return null;

        return { ticketsUsed: available, vgemsUsed: vgemsNeeded };
}

// ── Featured Characters ──

export function getFeaturedCharacters(allChars: CharacterRecord[]): CharacterRecord[] {
        return FEATURED_CHARACTERS.map((s) => allChars.find((c) => c.slug === s)).filter(Boolean) as CharacterRecord[];
}
