import { motion } from "motion/react";
import { useMemo } from "react";
import { useReducedMotion } from "@/ez/motion";

// Response-time line: the accent on the one series, no gradient, drawn in
// once. Down checks are marked in the status colour.
const Sparkline = ({ heartbeats = [] }) => {
	const reduce = useReducedMotion();
	const W = 320;
	const H = 48;

	const { linePath, downPts, min, max } = useMemo(() => {
		const beats = [...heartbeats].slice(-48).reverse();
		if (!beats.length) return { linePath: "", downPts: [], min: 0, max: 0 };
		const times = beats.map((b) => b.responseTime || 0);
		const hi = Math.max(...times, 10);
		const lo = Math.min(...times);
		const range = Math.max(hi - lo, 10);
		const step = W / Math.max(beats.length - 1, 1);
		const pts = beats.map((b, i) => [i * step, H - 4 - ((b.responseTime - lo) / range) * (H - 10)]);
		const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
		const downs = beats.map((b, i) => (b.siteStatus === "down" ? pts[i] : null)).filter(Boolean);
		return { linePath: line, downPts: downs, min: lo, max: hi };
	}, [heartbeats]);

	if (heartbeats.length < 2) return null;

	return (
		<div className="mt-3">
			<div className="mb-1 flex justify-between text-[11px] text-mute">
				<span>Response time, last {Math.min(heartbeats.length, 48)} checks</span>
				<span className="font-mono">
					{min.toLocaleString("en-US")}–{max.toLocaleString("en-US")} ms
				</span>
			</div>
			<svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} className="h-12 w-full" preserveAspectRatio="none" aria-hidden="true">
				<line x1="0" x2={W} y1={H} y2={H} stroke="var(--color-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
				<motion.path
					d={linePath}
					fill="none"
					stroke="var(--color-accent)"
					strokeWidth="1.5"
					strokeLinejoin="round"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
					initial={reduce ? false : { pathLength: 0 }}
					animate={{ pathLength: 1 }}
					transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
				/>
				{downPts.map(([x, y]) => (
					<circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="var(--color-bad)" />
				))}
			</svg>
		</div>
	);
};

export default Sparkline;
