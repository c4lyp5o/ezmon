import tls from "node:tls";

// Returns a normalized bundle of SSL findings for a URL, or null if not applicable.
const inspectCertificate = async ({ url, timeoutMs = 8000 }) => {
	let host;
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "https:") return null;
		host = parsed.hostname;
	} catch {
		return null;
	}

	return new Promise((resolve) => {
		const socket = tls.connect({
			host,
			port: 443,
			servername: host,
			rejectUnauthorized: false,
			timeout: timeoutMs,
		});
		const done = (val) => {
			socket.destroy();
			resolve(val);
		};

		socket.once("secureConnect", () => {
			try {
				const cert = socket.getPeerCertificate();
				if (!cert || !cert.valid_to) return done(null);
				const daysRemaining = Math.floor(
					(new Date(cert.valid_to).getTime() - Date.now()) / 86400000,
				);
				return done({
					valid: daysRemaining > 0,
					daysRemaining,
					warning: daysRemaining > 0 && daysRemaining <= 30,
					expired: daysRemaining <= 0,
					checkedAt: new Date(),
				});
			} catch (err) {
				return done(null);
			}
		});
		socket.once("error", () => done(null));
		socket.once("timeout", () => done(null));
		socket.setTimeout(timeoutMs);
	});
};

// Drives the SSL check for a site that has it enabled. Returns the new sslStatus
// object (or null if the site doesn't use SSL monitoring).
export const checkSSL = async (site) => {
	const cfg = site.check || {};
	if (!cfg.ssl) return null;
	try {
		const certOpts = await inspectCertificate({ url: site.url, timeoutMs: cfg.timeoutMs || 8000 });
		const warnDays = Number(cfg.sslDaysBeforeExpiry) || 14;
		let status = { valid: true, daysRemaining: null, warning: false, expired: false, checkedAt: new Date() };
		if (certOpts) {
			status = {
				...certOpts,
				warning: certOpts.daysRemaining > 0 && certOpts.daysRemaining <= warnDays,
			};
		}
		return status;
	} catch (err) {
		return null;
	}
};

export default checkSSL;