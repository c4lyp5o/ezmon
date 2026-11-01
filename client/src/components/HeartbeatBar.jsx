import { motion } from "motion/react";
import { useReducedMotion } from "@/ez/motion";
import { cx } from "@/ez/ui";

// Ten slots, oldest → newest. Colour is status, and every slot carries the
// exact code, response time and time in its title — never colour alone.
const tone = (status) => (status >= 200 && status < 300 ? "bg-ok" : status >= 400 ? "bg-bad" : "bg-warn");

const HeartbeatBar = ({ heartbeats = [] }) => {
	const reduce = useReducedMotion();
	const latest = [...heartbeats].reverse();
	const slots = Array(10).fill(null);
	const start = Math.max(0, 10 - latest.length);
	for (let i = 0; i < latest.length && start + i < 10; i++) slots[start + i] = latest[i];

	return (
		<div className="flex h-5 w-full items-end gap-1" role="img" aria-label={`Last ${Math.min(latest.length, 10)} checks`}>
			{slots.map((beat, index) => (
				<motion.div
					// biome-ignore lint/suspicious/noArrayIndexKey: slots are positional
					key={beat?._id || `empty-${index}`}
					className={cx("h-full flex-1 origin-bottom rounded-[2px]", beat ? tone(beat.status) : "bg-line")}
					initial={reduce ? false : { scaleY: 0.2, opacity: 0 }}
					animate={{ scaleY: 1, opacity: 1 }}
					transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : index * 0.025 }}
					title={
						beat
							? `Status ${beat.status} · ${beat.responseTime} ms · ${new Date(beat.timestamp).toLocaleString()}`
							: "No data"
					}
				/>
			))}
		</div>
	);
};

export default HeartbeatBar;
