import type { BannerType, PullResult } from '$lib/types';

export class GachaStore {
        banner: BannerType = $state('standard');
        isPulling: boolean = $state(false);
        lastPullResults: PullResult[] = $state([]);
        showReveal: boolean = $state(false);
        showSummary: boolean = $state(false);

        // Summary data computed from last pull results
        get summaryNewCount(): number {
                return this.lastPullResults.filter((r) => r.isNew).length;
        }
        get summaryEchoCount(): number {
                return this.lastPullResults.filter((r) => !r.isNew && r.echo > 0).length;
        }
        get summaryLiveCacheGained(): number {
                return this.lastPullResults.reduce((sum, r) => sum + r.liveCacheGained, 0);
        }
        get summaryBestRarity(): string {
                const rarities = this.lastPullResults.map((r) => r.rarity);
                if (rarities.includes('UR')) return 'UR';
                if (rarities.includes('SSR')) return 'SSR';
                if (rarities.includes('SR')) return 'SR';
                return 'R';
        }

        setBanner(banner: BannerType): void {
                this.banner = banner;
        }

        getTicketType(): 'blue' | 'red' {
                return this.banner === 'featured' ? 'red' : 'blue';
        }

        startPull(results: PullResult[]): void {
                this.isPulling = true;
                this.lastPullResults = results;
                this.showReveal = true;
                this.showSummary = false;
        }

        endReveal(): void {
                this.showReveal = false;
                this.showSummary = true;
        }

        closeSummary(): void {
                this.isPulling = false;
                this.lastPullResults = [];
                this.showSummary = false;
        }

        reset(): void {
                this.banner = 'standard';
                this.isPulling = false;
                this.lastPullResults = [];
                this.showReveal = false;
                this.showSummary = false;
        }
}

export const gachaStore = new GachaStore();
