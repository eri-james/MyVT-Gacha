// ─── Currency types ───

/** All game currencies */
export interface Currencies {
	vgems: number;       // Premium — gacha pulls
	vringgit: number;    // Upgrade + shop
	livecache: number;   // Upgrades
	blueTicket: number;  // Standard banner pulls
	redTicket: number;   // Featured banner pulls
}

/** Keys of the Currencies object for iteration */
export type CurrencyKey = keyof Currencies;

/** Currency display names */
export const CURRENCY_LABELS: Record<CurrencyKey, string> = {
	vgems: 'VGems',
	vringgit: 'VRinggit',
	livecache: 'LiveCache',
	blueTicket: 'Blue MyTicket',
	redTicket: 'Red MyTicket'
};

/** Default starting currencies for new accounts */
export const DEFAULT_CURRENCIES: Currencies = {
	vgems: 0,
	vringgit: 0,
	livecache: 0,
	blueTicket: 0,
	redTicket: 0
};
