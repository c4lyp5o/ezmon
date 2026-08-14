import { Elysia, t } from "elysia";

import Site from "../models/Site";
import { uptimeFor } from "../services/uptime";

// Pure-public module: no auth. Powers the shareable status page + badge.

const badgeColor = (uptime) => {
	if (uptime == null) return "#6b7280"; // gray
	if (uptime >= 99) return "#16a34a"; // green
	if (uptime >= 95) return "#eab308"; // yellow
	return "#dc2626"; // red
};

const publicModule = new Elysia({ prefix: "/api/v1/public" })
	.get(
		"/sites",
		async ({ query }) => {
			const sites = await Site.find({}, "name url hideUrl status lastCheckedAt")
				.lean();
			const days = Math.min(Number(query.days) || 7, 90);
			const data = await Promise.all(
				sites.map(async (site) => ({
					name: site.name,
					url: site.hideUrl ? null : site.url,
					status: site.status,
					lastCheckedAt: site.lastCheckedAt,
					uptime: await uptimeFor(site._id, { days }),
				})),
			);
			return { success: true, days, sites: data };
		},
		{ query: t.Object({ days: t.Optional(t.String()) }) },
	)
	// SVG shield badge: https://.../api/v1/public/badge/:siteName
	.get(
		"/badge/:name",
		async ({ params, query, set }) => {
			const days = Math.min(Number(query.days) || 7, 90);
			const site = await Site.findOne({ name: params.name }, "name url status").lean();
			if (!site) {
				set.headers["content-type"] = "image/svg+xml";
				set.status = 404;
				return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="24"><text x="10" y="16" font-family="Verdana" font-size="12" fill="#ef4444">site not found</text></svg>`;
			}
			const stats = await uptimeFor(site._id, { days });
			const pct = stats.uptime == null ? "n/a" : `${stats.uptime}%`;
			const color = badgeColor(stats.uptime);
			const slug = encodeURIComponent(site.name);

			const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="24" role="img" aria-label="Uptime ${pct}">
  <title>${site.name} uptime</title>
  <linearGradient id="a" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <rect rx="3" width="220" height="24" fill="#555"/>
  <rect rx="3" x="90" width="130" height="24" fill="${color}"/>
  <path d="M90 0h4v24h-4z" fill="${color}"/>
  <rect rx="3" width="220" height="24" fill="url(#a)"/>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,dejavu sans,sans-serif" font-size="11">
    <text x="45" y="15" fill="#010101" fill-opacity=".3">${slug}</text>
    <text x="46" y="14">${slug}</text>
    <text x="155" y="15" fill="#010101" fill-opacity=".3">${pct}</text>
    <text x="156" y="14">${pct}</text>
  </g>
</svg>`;

			set.headers["content-type"] = "image/svg+xml";
			set.headers["cache-control"] = "no-cache";
			return svg;
		},
		{ query: t.Object({ days: t.Optional(t.String()) }), params: t.Object({ name: t.String() }) },
	);

export default publicModule;