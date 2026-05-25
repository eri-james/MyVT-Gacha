// ─── Quest Logic ───────────────────────────────────────
// Pure functions for quest tracking, reset, and rewards.

import type { QuestDef, QuestProgress, QuestState } from '$lib/types';

export const DAILY_QUESTS: QuestDef[] = [
        { id: 'daily_login', label: 'Daily Login', target: 1, reward: { vgems: 100, streakScaled: true }, desc: 'Log in today' },
        { id: 'daily_pull', label: 'Pull Gacha', target: 1, reward: { vgems: 100 }, desc: 'Perform a gacha pull' },
        { id: 'daily_toss', label: 'Play Superchat Toss', target: 1, reward: { vgems: 100 }, desc: 'Complete a Superchat Toss round' },
        { id: 'daily_liveon', label: 'Play Live!ON', target: 1, reward: { vgems: 100 }, desc: 'Complete a Live!ON run' },
        { id: 'daily_all', label: 'Clear All Daily Quests', target: 1, reward: { vgems: 200, tickets: 1 }, desc: 'Claim all daily quests', meta: true }
];

export const WEEKLY_QUESTS: QuestDef[] = [
        { id: 'weekly_login3', label: 'Login 3 Days', target: 3, reward: { vgems: 200, tickets: 1 }, desc: 'Log in on 3 different days this week' },
        { id: 'weekly_pull30', label: 'Pull Gacha x30', target: 30, reward: { vgems: 200, tickets: 1 }, desc: 'Perform 30 gacha pulls' },
        { id: 'weekly_toss25', label: 'Play Toss x25', target: 25, reward: { vgems: 200, tickets: 1 }, desc: 'Play Superchat Toss 25 times' },
        { id: 'weekly_liveon25', label: 'Play Live!ON x25', target: 25, reward: { vgems: 200, tickets: 1 }, desc: 'Complete 25 Live!ON runs' },
        { id: 'weekly_all', label: 'Clear All Weekly Quests', target: 1, reward: { vgems: 500, tickets: 2 }, desc: 'Claim all weekly quests', meta: true }
];

// ── ISO Week ──

export function getISOWeekId(): string {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        // Shift to Thursday (ISO week contains the Thursday of that year)
        d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
        // January 4 is always in week 1
        const week1 = new Date(d.getFullYear(), 0, 4);
        const weekNum = 1 + Math.floor(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
        return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ── Quest Reset ──

export function resetQuestsIfNeeded(quests: QuestState): QuestState {
        const today = new Date().toISOString().split('T')[0];
        const weekId = getISOWeekId();

        let updated = { ...quests };

        // Daily reset
        if (updated.daily.date !== today) {
                const wasDate = updated.daily.date;
                updated = {
                        ...updated,
                        daily: { date: today, progress: {}, claimed: {} },
                        weekly: {
                                ...updated.weekly,
                                progress: {
                                        ...updated.weekly.progress,
                                        weekly_login3: wasDate !== today ? (updated.weekly.progress.weekly_login3 || 0) + 1 : updated.weekly.progress.weekly_login3
                                }
                        }
                };
                // Auto-increment login quests on new day
                if (wasDate !== today) {
                        updated = {
                                ...updated,
                                daily: { ...updated.daily, progress: { ...updated.daily.progress, daily_login: 1 } }
                        };
                }
        }

        // Weekly reset
        const currentWeekId = weekId;
        const prevWeekId = updated.weekly.weekId || '';
        if (prevWeekId !== currentWeekId) {
                const dailyLoginProgress = updated.daily.progress.daily_login || 0;
                updated = {
                        ...updated,
                        weekly: { date: today, weekId: currentWeekId, progress: { weekly_login3: dailyLoginProgress }, claimed: {} }
                };
        }

        return updated;
}

// ── Quest Progress ──

export function incrementQuestProgress(
        quests: QuestState,
        category: 'daily' | 'weekly',
        questId: string,
        amount: number
): QuestState {
        const updated = resetQuestsIfNeeded(quests);
        const q = updated[category];
        if (q.claimed[questId]) return updated;

        return {
                ...updated,
                [category]: {
                        ...q,
                        progress: { ...q.progress, [questId]: (q.progress[questId] || 0) + amount }
                }
        };
}

// ── Quest Claim Check ──

export function canClaimQuest(defs: QuestDef[], quests: QuestProgress, questId: string): boolean {
        const def = defs.find((q) => q.id === questId);
        if (!def) return false;
        if (quests.claimed[questId]) return false;
        const progress = quests.progress[questId] || 0;
        return progress >= def.target;
}

export function canClaimMeta(category: 'daily' | 'weekly', quests: QuestProgress): boolean {
        const defs = category === 'daily' ? DAILY_QUESTS : WEEKLY_QUESTS;
        return defs.filter((d) => !d.meta).every((d) => quests.claimed[d.id]);
}
