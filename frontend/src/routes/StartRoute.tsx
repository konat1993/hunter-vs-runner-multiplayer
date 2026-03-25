import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "../state/auth.store";
import { sendEmailOtp, signOut, verifyEmailOtp } from "../lib/supabase";
import { fetchActiveGameRoomId, joinGameRoomById } from "../lib/colyseus";
import { useGameStore } from "../state/game.store";
import { useMatchmakingStore } from "../state/matchmaking.store";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientReconnectError(err: unknown): boolean {
	if (!err || typeof err !== "object") return false;
	const candidate = err as { code?: number; message?: string };
	const message = (candidate.message ?? "").toLowerCase();
	return (
		candidate.code === 522 ||
		candidate.code === 523 ||
		message.includes("locked") ||
		message.includes("already full")
	);
}

export function StartRoute() {
	const navigate = useNavigate();
	const { session, wins, losses, loading } = useAuthStore();
	const { setRoom: setGameRoom } = useGameStore();
	const { setRoom: setMatchmakingRoom } = useMatchmakingStore();
	const isLoggedIn = !!session;
	const [email, setEmail] = useState("");
	const [otpCode, setOtpCode] = useState("");
	const [otpSent, setOtpSent] = useState(false);
	const [authMessage, setAuthMessage] = useState("");
	const [authError, setAuthError] = useState("");
	const [authLoading, setAuthLoading] = useState(false);
	const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
	const [activeSessionLoading, setActiveSessionLoading] = useState(false);
	const [resumeLoading, setResumeLoading] = useState(false);
	const [resumeError, setResumeError] = useState("");

	useEffect(() => {
		const accessToken = session?.access_token;
		if (!accessToken) {
			setActiveRoomId(null);
			return;
		}

		setActiveSessionLoading(true);
		fetchActiveGameRoomId(accessToken)
			.then((roomId) => setActiveRoomId(roomId))
			.catch(() => setActiveRoomId(null))
			.finally(() => setActiveSessionLoading(false));
	}, [session?.access_token]);

	async function handleSignIn() {
		const normalizedEmail = email.trim().toLowerCase();
		if (!normalizedEmail) {
			setAuthError("Enter your email.");
			return;
		}

		setAuthLoading(true);
		setAuthError("");
		setAuthMessage("");

		const { error } = await sendEmailOtp(normalizedEmail);
		setAuthLoading(false);

		if (error) {
			setAuthError(error.message);
			return;
		}

		setOtpSent(true);
		setAuthMessage("OTP code has been sent to your email.");
	}

	async function handleVerifyOtp() {
		const normalizedEmail = email.trim().toLowerCase();
		const normalizedOtp = otpCode.trim();
		if (!normalizedEmail || !normalizedOtp) {
			setAuthError("Enter your email and OTP code.");
			return;
		}

		setAuthLoading(true);
		setAuthError("");
		setAuthMessage("");

		const { error } = await verifyEmailOtp(
			normalizedEmail,
			normalizedOtp,
		);
		setAuthLoading(false);

		if (error) {
			setAuthError(error.message);
			return;
		}

		setAuthMessage("Signed in.");
	}

	async function handleSignOut() {
		await signOut();
	}

	function handlePlay() {
		navigate("/matchmaking");
	}

	async function handleResumeGame() {
		if (!activeRoomId || !session?.access_token) return;
		setResumeLoading(true);
		setResumeError("");
		try {
			let room: Awaited<ReturnType<typeof joinGameRoomById>> | null =
				null;
			let lastError: unknown = null;

			// Backend can still be in lock/seat transition for a short moment.
			for (let attempt = 0; attempt < 6; attempt += 1) {
				try {
					room = await joinGameRoomById(
						activeRoomId,
						session.access_token,
					);
					break;
				} catch (err) {
					lastError = err;
					if (!isTransientReconnectError(err)) {
						break;
					}
					await sleep(300);
				}
			}

			if (!room) {
				throw (
					lastError ??
					new Error("Reconnect failed")
				);
			}

			setGameRoom(room);
			setMatchmakingRoom(room);
			navigate(`/game/${room.roomId}`, { replace: true });
		} catch {
			setResumeError("Unable to return to active match.");
		} finally {
			setResumeLoading(false);
		}
	}

	if (loading) {
		return (
			<div
				style={{
					height: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "#080810",
				}}
			>
				<div
					className="animate-spin"
					style={{
						width: "40px",
						height: "40px",
						border: "2px solid transparent",
						borderTopColor: "#00dcff",
						borderRadius: "50%",
					}}
				/>
			</div>
		);
	}

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
					maxWidth: "480px",
					width: "100%",
					padding: "48px",
					display: "flex",
					flexDirection: "column",
					gap: "32px",
					boxShadow: "0 4px 32px rgba(0,0,0,0.7)",
				}}
			>
				{/* Game Title */}
				<h1
					style={{
						fontFamily: '"Rajdhani", system-ui, sans-serif',
						fontSize: "40px",
						fontWeight: 700,
						lineHeight: 1.1,
						letterSpacing: "0.03em",
						textAlign: "center",
						margin: 0,
					}}
				>
					<span
						style={{
							color: "#ff5010",
							textShadow: "0 0 10px rgba(255,80,16,0.8)",
						}}
					>
						HUNTER
					</span>{" "}
					<span style={{ color: "#f0f0fa" }}>
						VS
					</span>{" "}
					<span
						style={{
							color: "#00dcff",
							textShadow: "0 0 10px rgba(0,220,255,0.8)",
						}}
					>
						RUNNER
					</span>
				</h1>

				{/* Stats row */}
				{isLoggedIn && (
					<div
						style={{
							display: "flex",
							gap: "12px",
						}}
					>
						{/* Wins chip */}
						<div
							style={{
								flex: 1,
								background: "#1a1a2e",
								border: "1px solid rgba(0,220,255,0.2)",
								borderRadius:
									"12px",
								padding: "16px",
								textAlign: "center",
							}}
						>
							<div
								style={{
									fontFamily: '"Inter", system-ui, sans-serif',
									fontSize: "13px",
									color: "#8888aa",
									letterSpacing:
										"0.08em",
									textTransform:
										"uppercase",
									marginBottom:
										"4px",
								}}
							>
								WINS
							</div>
							<div
								style={{
									fontFamily: '"Rajdhani", system-ui, sans-serif',
									fontSize: "32px",
									fontWeight: 700,
									color: "#00dcff",
									lineHeight: 1,
								}}
							>
								{wins}
							</div>
						</div>

						{/* Losses chip */}
						<div
							style={{
								flex: 1,
								background: "#1a1a2e",
								border: "1px solid rgba(255,80,16,0.2)",
								borderRadius:
									"12px",
								padding: "16px",
								textAlign: "center",
							}}
						>
							<div
								style={{
									fontFamily: '"Inter", system-ui, sans-serif',
									fontSize: "13px",
									color: "#8888aa",
									letterSpacing:
										"0.08em",
									textTransform:
										"uppercase",
									marginBottom:
										"4px",
								}}
							>
								LOSSES
							</div>
							<div
								style={{
									fontFamily: '"Rajdhani", system-ui, sans-serif',
									fontSize: "32px",
									fontWeight: 700,
									color: "#ff5010",
									lineHeight: 1,
								}}
							>
								{losses}
							</div>
						</div>
					</div>
				)}

				{/* Primary CTA */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "12px",
					}}
				>
					{isLoggedIn && activeRoomId && (
						<div
							style={{
								border: "1px solid rgba(0,220,255,0.25)",
								borderRadius:
									"12px",
								padding: "12px",
								background: "rgba(0,220,255,0.06)",
							}}
						>
							<p
								style={{
									margin: 0,
									marginBottom:
										"10px",
									fontSize: "13px",
									color: "#a5a5c2",
									textAlign: "center",
								}}
							>
								Active match
								detected for your
								account. Do you
								want to return?
							</p>
							<button
								className="btn-neon-runner focus-ring"
								onClick={
									handleResumeGame
								}
								disabled={
									resumeLoading
								}
								style={{
									padding: "10px 0",
									width: "100%",
									fontSize: "14px",
								}}
							>
								{resumeLoading
									? "RETURNING..."
									: "RETURN TO MATCH"}
							</button>
							{resumeError ? (
								<p
									style={{
										color: "#ff5010",
										margin: "8px 0 0",
										fontSize: "12px",
										textAlign: "center",
									}}
								>
									{
										resumeError
									}
								</p>
							) : null}
						</div>
					)}

					{isLoggedIn ? (
						<button
							className="btn-neon-runner focus-ring"
							onClick={handlePlay}
							disabled={
								activeSessionLoading
							}
							style={{
								padding: "16px 0",
								fontSize: "20px",
								width: "100%",
							}}
						>
							{activeSessionLoading
								? "CHECKING..."
								: "PLAY"}
						</button>
					) : (
						<>
							<input
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) =>
									setEmail(
										e
											.target
											.value,
									)
								}
								className="focus-ring"
								style={{
									width: "100%",
									borderRadius:
										"9999px",
									border: "1px solid rgba(255,255,255,0.12)",
									background: "rgba(255,255,255,0.03)",
									color: "#f0f0fa",
									fontFamily: '"Inter", system-ui, sans-serif',
									fontSize: "16px",
									padding: "14px 18px",
									outline: "none",
								}}
							/>

							{otpSent && (
								<input
									type="text"
									inputMode="numeric"
									placeholder="OTP code"
									value={
										otpCode
									}
									onChange={(
										e,
									) =>
										setOtpCode(
											e
												.target
												.value,
										)
									}
									className="focus-ring"
									style={{
										width: "100%",
										borderRadius:
											"9999px",
										border: "1px solid rgba(255,255,255,0.12)",
										background: "rgba(255,255,255,0.03)",
										color: "#f0f0fa",
										fontFamily: '"Inter", system-ui, sans-serif',
										fontSize: "16px",
										padding: "14px 18px",
										outline: "none",
										letterSpacing:
											"0.08em",
									}}
								/>
							)}

							{!otpSent ? (
								<button
									className="btn-neon-runner focus-ring"
									onClick={
										handleSignIn
									}
									disabled={
										authLoading
									}
									style={{
										padding: "16px 0",
										fontSize: "18px",
										width: "100%",
									}}
								>
									{authLoading
										? "SENDING..."
										: "SEND OTP"}
								</button>
							) : (
								<button
									className="btn-neon-runner focus-ring"
									onClick={
										handleVerifyOtp
									}
									disabled={
										authLoading
									}
									style={{
										padding: "16px 0",
										fontSize: "18px",
										width: "100%",
									}}
								>
									{authLoading
										? "VERIFYING..."
										: "VERIFY OTP"}
								</button>
							)}

							{otpSent && (
								<button
									onClick={
										handleSignIn
									}
									disabled={
										authLoading
									}
									style={{
										background: "none",
										border: "none",
										color: "#8888aa",
										fontFamily: '"Inter", system-ui, sans-serif',
										fontSize: "13px",
										cursor: "pointer",
										textAlign: "center",
									}}
								>
									Resend
									code
								</button>
							)}

							{authMessage && (
								<p
									style={{
										color: "#00dcff",
										margin: 0,
										fontSize: "13px",
										textAlign: "center",
									}}
								>
									{
										authMessage
									}
								</p>
							)}

							{authError && (
								<p
									style={{
										color: "#ff5010",
										margin: 0,
										fontSize: "13px",
										textAlign: "center",
									}}
								>
									{
										authError
									}
								</p>
							)}
						</>
					)}

					{isLoggedIn && (
						<button
							onClick={handleSignOut}
							style={{
								background: "none",
								border: "none",
								color: "#8888aa",
								fontFamily: '"Inter", system-ui, sans-serif',
								fontSize: "13px",
								cursor: "pointer",
								textAlign: "center",
								transition: "color 120ms",
							}}
							onMouseEnter={(e) =>
								(e.currentTarget.style.color =
									"#f0f0fa")
							}
							onMouseLeave={(e) =>
								(e.currentTarget.style.color =
									"#8888aa")
							}
						>
							Sign out
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
