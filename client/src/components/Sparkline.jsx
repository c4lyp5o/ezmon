import { useMemo } from "react";

// Premium response-time sparkline: gradient stroke, soft area fill, draw-in.
const Sparkline = ({ heartbeats = [], themeSpark }) => {
	const W = 320;
	const H = 56;
	const stroke = themeSpark?.stroke || "#22c55e";
	const downColor = themeSpark?.down || "#ef4444";

	const { linePath, areaPath, downPts } = useMemo(() => {
		const beats = [...heartbeats].slice(-48).reverse(); // oldest → newest
		if (!beats.length) return { linePath: "", areaPath: "", downPts: [] };

		const times = beats.map((b) => b.responseTime || 0);
		const max = Math.max(...times, 10);
		const min = Math.min(...times);
		const range = Math.max(max - min, 10);
		const n = beats.length;
		const step = W / Math.max(n - 1, 1);

		const pts = beats.map((b, i) => {
			const normal = range > 0 ? (b.responseTime - min) / range : 0;
			return [i * step, H - 4 - normal * (H - 10)];
		});

		const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
		const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
		const downs = beats.map((b, i) => (b.siteStatus === "down" ? pts[i] : null)).filter(Boolean);

		return { linePath: line, areaPath: area, downPts: downs };
	}, [heartbeats]);

	if (heartbeats.length < 2) return null;

	const gid = `spark-fade-${stroke.replace("#", "")}`;

	return (
		<div className="mt-3">
			<svg viewBox={`-6 -4 ${W + 12} ${H + 10}`} className="w-full h-14" preserveAspectRatio="none">
				<defs>
					<linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
						<stop offset="100%" stopColor={stroke} stopOpacity="0" />
					</linearGradient>
					<linearGradient id={`${gid}-line`} x1="0" y1="0" x2="1" y2="0">
						<stop offset="0%" stopColor={stroke} stopOpacity="0.4" />
						<stop offset="100%" stopColor={stroke} />
					</linearGradient>
				</defs>
				<path d={areaPath} fill={`url(#${gid})`} />
				<path d={linePath} fill="none" stroke={`url(#${gid}-line)`} strokeWidth="2"
					strokeLinejoin="round" strokeLinecap="round" className="spark-path" />
				{downPts.map(([x, y], i) => (
					<circle key={i} cx={x} cy={y} r="2.8" fill={downColor}
						stroke={downColor} strokeOpacity="0.35" strokeWidth="3" />
				))}
			</svg>
		</div>
	);
};

export default Sparkline;