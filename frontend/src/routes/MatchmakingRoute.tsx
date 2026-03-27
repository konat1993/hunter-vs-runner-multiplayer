import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMatchmakingStore } from "../state/matchmaking.store";
import { useGameStore } from "../state/game.store";
import { useAuthStore } from "../state/auth.store";
import { joinGameRoom } from "../lib/colyseus";
import type { Room } from "@colyseus/sdk";
import type {
	GameRoomStateSnapshot,
	ServerErrorMessage,
} from "../game/room-types";

const MATCHMAKING_TIMEOUT_MS = 30000;

function formatElapsed(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function MatchmakingRoute() {
	const navigate = useNavigate();
	const { session } = useAuthStore();
	const {
		status,
		elapsedSeconds,
		errorMessage,
		setStatus,
		setRoom,
		setElapsed,
		setError,
		reset,
	} = useMatchmakingStore();
	const {
		setRoom: setGameRoom,
		setPhase,
		setLocalSession,
		setTimers,
		setEnded,
	} = useGameStore();

	const elapsedRef = useRef(0);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const roomRef = useRef<Room | null>(null);
	const matchedRef = useRef(false);

	useEffect(() => {
		const activeSession = session;
		if (!activeSession) {
			navigate("/", { replace: true });
			return;
		}
		const accessToken = activeSession.access_token;

		async function startMatchmaking() {
			let stateChangeHandler:
				| ((state: GameRoomStateSnapshot) => void)
				| null = null;
			let offServerError: (() => void) | null =
				null;
			let leaveHandler:
				| ((code: number, reason?: string) => void)
				| null = null;
			// Keep explicit listener disposers for deterministic cleanup.
			setStatus("searching");
			setError(null);
			matchedRef.current = false;
			elapsedRef.current = 0;
			setElapsed(0);

			timerRef.current = setInterval(() => {
				elapsedRef.current += 1;
				setElapsed(elapsedRef.current);

				if (
					elapsedRef.current >=
					MATCHMAKING_TIMEOUT_MS / 1000
				) {
					clearInterval(timerRef.current!);
					setStatus("timeout");
					roomRef.current?.leave();
				}
			}, 1000);

			try {
				const gameRoom =
					await joinGameRoom(accessToken);
				roomRef.current = gameRoom;
				setRoom(gameRoom);
				setGameRoom(gameRoom);

				// Listen to state changes
				stateChangeHandler = (
					state: GameRoomStateSnapshot,
				) => {
						if (!state) return;
						if (state.phase)
							setPhase(state.phase);
						setTimers(
							state.countdownMsRemaining ??
								3000,
							state.matchMsRemaining ??
								120000,
							state.reconnectMsRemaining ?? 0,
						);

						if (
							!matchedRef.current &&
							(state.phase ===
								"COUNTDOWN" ||
								state.phase ===
									"RUNNING")
						) {
							// Guard repeated state patches from re-triggering navigation/setters.
							matchedRef.current = true;
							clearInterval(
								timerRef.current!,
							);
							setStatus("found");

							// Find local player role
							state.players?.forEach(
								(
									player,
									sessionId,
								) => {
									if (
										sessionId ===
										gameRoom.sessionId
									) {
										setLocalSession(
											sessionId,
											player.role,
										);
									}
								},
							);

							navigate(`/game/${gameRoom.roomId}`, {
								replace: true,
							});
						}

						if (
							state.phase ===
								"ENDED" &&
							state.endReason &&
							state.winnerSessionId
						) {
							setEnded(
								state.endReason,
								state.winnerSessionId,
							);
						}
					};
				gameRoom.onStateChange(stateChangeHandler);

				offServerError = gameRoom.onMessage(
					"server:error",
					(data: ServerErrorMessage) => {
						console.error(
							"Server error:",
							data,
						);
						clearInterval(
							timerRef.current!,
						);
						if (data?.code === "TIMEOUT") {
							setStatus("timeout");
							setError(null);
						} else {
							setStatus("error");
							setError(
								data?.message ??
									"Unable to search for opponent.",
							);
						}
					},
				);

				leaveHandler = () => {
					clearInterval(timerRef.current!);
				};
				gameRoom.onLeave(leaveHandler);
			} catch (err) {
				console.error("Failed to join room:", err);
				clearInterval(timerRef.current!);
				setStatus("error");
				setError(
					"Cannot connect to matchmaking server. Check your connection and try again.",
				);
			}
			return () => {
				if (stateChangeHandler) {
					roomRef.current?.onStateChange.remove(
						stateChangeHandler,
					);
				}
				offServerError?.();
				if (leaveHandler) {
					roomRef.current?.onLeave.remove(
						leaveHandler,
					);
				}
				// Ensure listeners are removed even when join fails midway.
			};
		}

		let disposeRoomListeners: (() => void) | void;
		startMatchmaking().then((dispose) => {
			disposeRoomListeners = dispose;
		});

		return () => {
			disposeRoomListeners?.();
			clearInterval(timerRef.current!);
			// After successful match, room ownership is transferred to GameRoute.
			if (!matchedRef.current) {
				roomRef.current?.leave();
			}
		};
	}, [
		session,
		navigate,
		setStatus,
		setError,
		setElapsed,
		setRoom,
		setGameRoom,
		setPhase,
		setTimers,
		setLocalSession,
		setEnded,
	]);

	async function handleCancel() {
		clearInterval(timerRef.current!);
		roomRef.current?.leave();
		reset();
		navigate("/", { replace: true });
	}

	const isTimeout = status === "timeout" || status === "error";

	return (
		<div
			style={{
				height: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "radial-gradient(ellipse at center, rgba(20,20,50,0.8) 0%, #080810 70%)",
				padding: "16px",
			}}
		>
			<div
				className="glass-panel"
				style={{
					maxWidth: "400px",
					width: "100%",
					padding: "40px",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "24px",
					boxShadow: "0 4px 32px rgba(0,0,0,0.7)",
				}}
			>
				{isTimeout ? (
					<>
						<p
							style={{
								fontFamily: '"Inter", system-ui, sans-serif',
								fontSize: "16px",
								color: "#8888aa",
								textAlign: "center",
							}}
						>
							{status === "error"
								? (errorMessage ??
									"Cannot connect to matchmaking server.")
								: "No opponent found. Try again later."}
						</p>
						<button
							className="btn-neon-runner focus-ring"
							onClick={() => {
								reset();
								navigate("/");
							}}
							style={{
								padding: "12px 32px",
								fontSize: "16px",
							}}
						>
							BACK TO MENU
						</button>
					</>
				) : (
					<>
						{/* Sonar animation */}
						<div
							style={{
								position: "relative",
								width: "80px",
								height: "80px",
								display: "flex",
								alignItems: "center",
								justifyContent:
									"center",
							}}
						>
							<div
								className="animate-sonar"
								style={{
									position: "absolute",
									width: "60px",
									height: "60px",
									border: "2px solid #00dcff",
									borderRadius:
										"50%",
								}}
							/>
							<div
								className="animate-sonar-delayed"
								style={{
									position: "absolute",
									width: "60px",
									height: "60px",
									border: "2px solid #00dcff",
									borderRadius:
										"50%",
								}}
							/>
							<div
								style={{
									width: "16px",
									height: "16px",
									background: "#00dcff",
									borderRadius:
										"50%",
									boxShadow: "0 0 10px #00dcff",
								}}
							/>
						</div>

						{/* Status text */}
						<h2
							style={{
								fontFamily: '"Rajdhani", system-ui, sans-serif',
								fontSize: "22px",
								fontWeight: 600,
								letterSpacing:
									"0.02em",
								color: "#f0f0fa",
								textAlign: "center",
								margin: 0,
							}}
						>
							LOOKING FOR OPPONENT…
						</h2>

						{/* Elapsed time */}
						<span
							style={{
								fontFamily: '"Share Tech Mono", monospace',
								fontSize: "13px",
								color: "#8888aa",
							}}
						>
							{formatElapsed(
								elapsedSeconds,
							)}
						</span>

						{/* Cancel button */}
						<button
							className="btn-ghost focus-ring"
							onClick={handleCancel}
							style={{
								padding: "10px 28px",
								fontSize: "14px",
							}}
						>
							CANCEL
						</button>
					</>
				)}
			</div>
		</div>
	);
}
