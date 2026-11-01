import logger from "../utils/logger";

// Pluggable alert providers. Each reads its own env key and returns true if
// sent (or if the provider is disabled, in which case it's a no-op, not a failure).

const providerHeader = (provider) =>
	provider === "discord" ? "Discord" : provider === "slack" ? "Slack" : provider;

const notifyProvider = async ({ provider, url, payload }) => {
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) {
			logger.error(`[alerts] ${provider} responded ${res.status}`);
			return false;
		}
		return true;
	} catch (err) {
		logger.error(`[alerts] ${provider} failed: ${err.message}`);
		return false;
	}
};

const formatStatus = (status) => {
	const map = { up: "✅ UP", down: "🔴 DOWN", failing: "🟡 FAILING" };
	return map[status] || status;
};

const buildText = ({ site, from, to, ssl }) => {
	const base = `*${site.name}* — ${formatStatus(to)}\n`;
	const lines = [`Status changed from ${from} to ${to}.`];
	if (site.url) lines.push(`URL: ${site.url}`);
	if (site.responseTimeMs != null && site.responseTimeMs > 0)
		lines.push(`Response: ${site.responseTimeMs}ms`);
	if (ssl) lines.push(`SSL: ${ssl}`);
	return { base, lines: lines.join("\n") };
};

const dispatch = async ({ site, from, to, ssl }) => {
	const cfg = site.alerts || {};
	if (cfg.disabled) return;

	const { base, lines } = buildText({ site, from, to, ssl });
	const cfgChannels = {
		telegram: { enabled: cfg.telegram, url: process.env.TELEGRAM_BOT_API, target: process.env.TELEGRAM_CHAT_ID },
		discord: { enabled: cfg.discord, url: process.env.DISCORD_WEBHOOK_URL },
		slack: { enabled: cfg.slack, url: process.env.SLACK_WEBHOOK_URL },
		email: { enabled: cfg.email, url: process.env.SMTP_ALERT_WEBHOOK_URL },
	};

	let sent = 0;
	for (const [provider, ch] of Object.entries(cfgChannels)) {
		if (!ch.enabled || !ch.url) continue;
		let payload;
		try {
			switch (provider) {
				case "telegram":
					if (!ch.target) { logger.warn("[alerts] telegram enabled but TELEGRAM_CHAT_ID unset"); continue; }
					payload = {
						chat_id: ch.target,
						text: `${base}${lines}`,
						parse_mode: "Markdown",
					};
					break;
				case "discord":
					payload = { content: `${base}${lines}` };
					break;
				case "slack":
					payload = { text: `${base}${lines}` };
					break;
				case "email":
					payload = { subject: `[ezmon] ${site.name} ${to}`, text: lines };
					break;
				default:
					continue;
			}
			if (await notifyProvider({ provider, url: ch.url, payload })) sent++;
		} catch (err) {
			logger.error(`[alerts] ${provider} construction failed: ${err.message}`);
		}
	}

	if (sent > 0) logger.info(`[alerts] sent ${sent} notification(s) for "${site.name}"`);
};

export const alerts = {
	// Called by the worker when a site's status changes.
	notify: async ({ site, from, to, ssl }) => {
		const cfg = site.alerts || {};
		if (cfg.notifyOnRecovery === false && to === "up") return; // opt-in only; default notify.
		try {
			await dispatch({ site, from, to, ssl });
		} catch (err) {
			logger.error(`[alerts] ${err.message}`);
		}
	},
};

export default alerts;