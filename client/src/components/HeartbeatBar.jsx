import { cn } from "@/lib/utils";

const getStatusColor = (status, themeHeartbeat) => {
	if (status >= 200 && status < 300) return themeHeartbeat.up;
	if (status >= 400) return themeHeartbeat.down;
	return themeHeartbeat.failing;
};

const HeartbeatBar = ({ heartbeats = [], themeHeartbeat }) => {
	const latestHeartbeats = [...heartbeats].reverse();
	const displayBeats = Array(10).fill(null);
	const startIndex = Math.max(0, 10 - latestHeartbeats.length);
	for (let i = 0; i < latestHeartbeats.length; i++) {
		displayBeats[startIndex + i] = latestHeartbeats[i];
	}
	const lastBeatIndex = displayBeats.map((b) => !!b).lastIndexOf(true);

	return (
		<div className="flex w-full gap-1 h-6">
			{displayBeats.map((beat, index) => {
				const isLastBeat = index === lastBeatIndex;
				const color = beat
					? getStatusColor(beat.status, themeHeartbeat)
					: themeHeartbeat.noData;

				return (
					<div
						key={beat?._id || index}
						className={cn(
							"flex-1 transition-all duration-300",
							color,
							themeHeartbeat.style,
							isLastBeat && beat ? "scale-y-125" : "", // optional last-beat emphasis
						)}
						title={
							beat
								? `Status: ${beat.status}\nResponse Time: ${beat.responseTime}ms\nTime: ${new Date(
										beat.timestamp,
									).toLocaleString()}`
								: "No data"
						}
					/>
				);
			})}
		</div>
	);
};

export default HeartbeatBar;
