import type { Rarity, TrainableStat, SparkQuality, RunGrade } from './common';

// ─── Raw character data (from characters.json) ───

/** All 6 stats on a character */
export interface CharacterStats {
        st: number; // Stamina — entry cost for Live!ON
        ps: number; // Passion — base stat
        tc: number; // Tech — trainable
        ch: number; // Charisma — trainable
        vc: number; // Vocal — trainable
        mg: number; // Management — trainable
}

/** Rarity metadata from character data */
export interface RarityData {
        debut: string;
        status: string;
        subscribers: number;
        longevity_pts: number;
        follower_pts: number;
        status_pts: number;
        total_pts: number;
}

/** Raw character entry from characters.json */
export interface CharacterData {
        name: string;
        slug: string;
        url: string;
        image: string;
        agency: string;
        rarity: Rarity;
        stats: CharacterStats;
        power: number;
        rarity_data: RarityData;
}

// ─── Collection (owned base characters) ───

/** A character in the player's collection */
export interface CollectionEntry {
        slug: string;
        obtainedAt: number; // unix timestamp
}

// ─── Roster (trained VTubers) ───

/** The 4 trainable stats on a trained copy */
export interface TrainedStats {
        tc: number;
        ch: number;
        vc: number;
        mg: number;
}

/** Sparks passed down from a previous run */
export interface Sparks {
        stat1: TrainableStat;
        stat2: TrainableStat;
        value1: number;
        value2: number;
        quality: SparkQuality;
}

/** A trained VTuber stored in the roster */
export interface RosterEntry {
        id: string;              // crypto.randomUUID()
        slug: string;            // base character slug
        sourceRunId: string;     // which Live!ON run produced this
        parentRunId?: string;    // roster ID of the entry whose sparks were inherited (lineage link)
        generation: number;      // 1 = no inheritance, 2 = inherited from gen 1, etc.
        createdAt: number;       // unix timestamp
        stats: TrainedStats;     // final trained stats
        grade: RunGrade;         // performance grade
        totalHype: number;       // total hype generated in the run
        sparks: Sparks | null;   // sparks to pass to next run
        quality: SparkQuality;   // spark quality for next run
}

/** Maximum roster size */
export const MAX_ROSTER_SIZE = 70;
