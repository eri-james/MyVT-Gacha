// Cloudflare Workers SPA fallback handler.
// When Cloudflare serves static assets, any path that doesn't match a file
// (e.g. /studio, /gacha) falls through to this worker, which serves
// index.html so the client-side SvelteKit router can handle it.

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		// Let static assets pass through normally (Cloudflare handles these)
		if (url.pathname.startsWith('/_app/') || url.pathname.startsWith('/data/')) {
			return env.ASSETS.fetch(request);
		}

		// Try to fetch the path as a static asset first
		const response = await env.ASSETS.fetch(request);
		if (response.status !== 404) return response;

		// SPA fallback: serve index.html for any non-asset route
		return env.ASSETS.fetch(new Request(new URL('/index.html', url)));
	}
};
