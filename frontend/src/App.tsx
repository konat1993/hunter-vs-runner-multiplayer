import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { StartRoute } from "./routes/StartRoute";
import { AuthCallbackRoute } from "./routes/AuthCallbackRoute";
import { MatchmakingRoute } from "./routes/MatchmakingRoute";
import { GameRoute } from "./routes/GameRoute";
import { useAuthStore } from "./state/auth.store";

export default function App() {
	const { initialize, initialized } = useAuthStore();

	useEffect(() => {
		initialize();
	}, [initialize]);

	if (!initialized) {
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
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<StartRoute />} />
				<Route
					path="/auth/callback"
					element={<AuthCallbackRoute />}
				/>
				<Route
					path="/matchmaking"
					element={<MatchmakingRoute />}
				/>
				<Route path="/game/:roomId" element={<GameRoute />} />
				<Route
					path="*"
					element={<Navigate to="/" replace />}
				/>
			</Routes>
		</BrowserRouter>
	);
}
