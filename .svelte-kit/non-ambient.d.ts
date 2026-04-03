
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/cron" | "/api/cron/fetch-games" | "/api/cron/fetch-odds" | "/api/cron/verify-results" | "/api/predict-batch" | "/api/predict" | "/api/proxy" | "/api/public" | "/api/public/track-record" | "/api/stripe" | "/api/stripe/checkout" | "/api/stripe/portal" | "/api/stripe/webhooks" | "/bankroll" | "/legal" | "/legal/privacy" | "/legal/responsible-gambling" | "/legal/terms" | "/login" | "/methodology" | "/picks" | "/pricing" | "/public" | "/results" | "/stats" | "/totales" | "/tracking";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/api": Record<string, never>;
			"/api/cron": Record<string, never>;
			"/api/cron/fetch-games": Record<string, never>;
			"/api/cron/fetch-odds": Record<string, never>;
			"/api/cron/verify-results": Record<string, never>;
			"/api/predict-batch": Record<string, never>;
			"/api/predict": Record<string, never>;
			"/api/proxy": Record<string, never>;
			"/api/public": Record<string, never>;
			"/api/public/track-record": Record<string, never>;
			"/api/stripe": Record<string, never>;
			"/api/stripe/checkout": Record<string, never>;
			"/api/stripe/portal": Record<string, never>;
			"/api/stripe/webhooks": Record<string, never>;
			"/bankroll": Record<string, never>;
			"/legal": Record<string, never>;
			"/legal/privacy": Record<string, never>;
			"/legal/responsible-gambling": Record<string, never>;
			"/legal/terms": Record<string, never>;
			"/login": Record<string, never>;
			"/methodology": Record<string, never>;
			"/picks": Record<string, never>;
			"/pricing": Record<string, never>;
			"/public": Record<string, never>;
			"/results": Record<string, never>;
			"/stats": Record<string, never>;
			"/totales": Record<string, never>;
			"/tracking": Record<string, never>
		};
		Pathname(): "/" | "/api/cron/fetch-games" | "/api/cron/fetch-odds" | "/api/cron/verify-results" | "/api/predict-batch" | "/api/predict" | "/api/proxy" | "/api/public/track-record" | "/api/stripe/checkout" | "/api/stripe/portal" | "/api/stripe/webhooks" | "/bankroll" | "/legal/privacy" | "/legal/responsible-gambling" | "/legal/terms" | "/login" | "/methodology" | "/picks" | "/pricing" | "/public" | "/results" | "/stats" | "/totales" | "/tracking";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/data/backtesting-results.json" | "/data/nba-stats.json" | "/icons/icon-128.png" | "/icons/icon-144.png" | "/icons/icon-152.png" | "/icons/icon-192.png" | "/icons/icon-384.png" | "/icons/icon-512.png" | "/icons/icon-72.png" | "/icons/icon-96.png" | "/robots.txt" | "/sitemap.xml" | string & {};
	}
}