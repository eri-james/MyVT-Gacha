// Cloudflare Workers SPA fallback handler.
// Any path that doesn't match a file falls through to this worker,
// which serves index.html so the client-side SvelteKit router can handle it.

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname.startsWith('/_app/') || url.pathname.startsWith('/data/')) {
			return env.ASSETS.fetch(request);
		}

		const response = await env.ASSETS.fetch(request);
		if (response.status !== 404) return response;

		return env.ASSETS.fetch(new Request(new URL('/index.html', url)));
	}
};
