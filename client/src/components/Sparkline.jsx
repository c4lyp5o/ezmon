import { useMemo } from "react";

// Renders a compact response-time sparkline from the latest heartbeats.
const Sparkline = ({ heartbeats = [], themeSpark }) => {
	const W = 320;
	const H = 48;
	const stroke = themeSpark?.stroke || "#22c55e";
	const downColor = themeSpark?.down || "#ef4444";

	const { pts, downIdx } = useMemo(() => {
		const beats = [...heartbeats].slice(-40).reverse(); // oldest → newest
		if (!beats.length) return { pts: "", downIdx: new Set() };

		const times = beats.map((b) => b.responseTime || 0);
		const max = Math.max(...times, 10);
		const min = Math.min(...times);
		const range = Math.max(max - min, 10);
		const n = beats.length;
		const step = W / Math.max(n - 1, 1);

		const dIdx = new Set();
		const points = beats.map((b, i) => {
			const normal = range > 0 ? (b.responseTime - min) / range : 0;
			return [i * step, H - 4 - normal * (H - 10)];
		});
		// identify down status
		beats.forEach((b, i) => { if (b.siteStatus === "down") dIdx.add(i); });

		return { pts: points, downIdx: dIdx };
	}, [heartbeats]);

	if (heartbeats.length < 2) return null;

	const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

	return (
		<div className="mt-2">
			<svg viewBox={`-5 -4 ${W + 10} ${H + 8}`} className="w-full h-12" preserveAspectRatio="none">
				<path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
				{[...downIdx].map((i) => {
					const [x, y] = pts[i];
					return <circle key={i} cx={x} cy={y} r="2.5" fill={downColor} />;
				})}
			</svg>
		</div>
	);
};

export default Sparkline;