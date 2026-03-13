
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
		RouteId(): "/" | "/bankroll" | "/login" | "/picks" | "/stats" | "/totales" | "/tracking";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/bankroll": Record<string, never>;
			"/login": Record<string, never>;
			"/picks": Record<string, never>;
			"/stats": Record<string, never>;
			"/totales": Record<string, never>;
			"/tracking": Record<string, never>
		};
		Pathname(): "/" | "/bankroll" | "/login" | "/picks" | "/stats" | "/totales" | "/tracking";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/data/nba-stats.json" | "/icons/icon-128.png" | "/icons/icon-144.png" | "/icons/icon-152.png" | "/icons/icon-192.png" | "/icons/icon-384.png" | "/icons/icon-512.png" | "/icons/icon-72.png" | "/icons/icon-96.png" | string & {};
	}
}