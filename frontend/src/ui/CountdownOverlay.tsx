import { useGameStore } from "../state/game.store";

export function CountdownOverlay() {
	const { countdownMs, phase, localRole } = useGameStore();
	const seconds = Math.ceil(countdownMs / 1000);
	const displayValue =
		phase === "COUNTDOWN"
			? seconds > 0
				? String(seconds)
				: "GO"
			: "";
	const displayKey = `${phase}-${displayValue}`;

	const isGo = displayValue === "GO";
	const roleColor = localRole === "HUNTER" ? "#ff5010" : "#00dcff";
	const goColor = localRole ? roleColor : "#f0f0fa";

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: "rgba(0,0,0,0.4)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 20,
				pointerEvents: "none",
			}}
		>
			<span
				key={displayKey}
				className="animate-countdown"
				style={{
					fontFamily: '"Rajdhani", system-ui, sans-serif',
					fontSize: "clamp(120px, 20vw, 220px)",
					fontWeight: 700,
					lineHeight: 1,
					color: isGo ? goColor : "#f0f0fa",
					textShadow: "0 0 40px rgba(255,255,255,0.6), 0 0 80px rgba(255,255,255,0.2)",
					textTransform: "uppercase",
					display: "block",
				}}
			>
				{displayValue}
			</span>
		</div>
	);
}
