import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Arena } from "./Arena";
import { PlayerMesh } from "./PlayerMesh";
import { Lights } from "./Lights";
import { useGameStore } from "../state/game.store";
import {
	buildInputFrame,
	startInputListening,
	stopInputListening,
} from "../game/input";
import { CLIENT_TICK_HZ, ENABLE_POSTPROCESSING } from "../game/perf";
import { PredictionBuffer } from "../game/predict";
import { sendInput } from "../game/net";
import { CAMERA_POSITION } from "../game/camera";
import type { GameRoomStateSnapshot } from "../game/room-types";
import type { Room } from "@colyseus/sdk";

interface SceneProps {
	room: Room;
}

const predictionBuffer = new PredictionBuffer();
let inputSeq = 1;
const CLIENT_TICK_INTERVAL_MS = 1000 / CLIENT_TICK_HZ;

function CameraRig() {
	const { camera } = useThree();
	useEffect(() => {
		camera.position.set(...CAMERA_POSITION);
		camera.lookAt(0, 0, 0);
	}, [camera]);
	return null;
}

function GameLoop({
	room,
	onLocalFacingUpdate,
}: {
	room: Room;
	onLocalFacingUpdate: (facingRad: number) => void;
}) {
	const lastTimeRef = useRef<number>(performance.now());
	const accumulatorRef = useRef<number>(0);
	const { localRole, setLocalTransform } = useGameStore();

	useEffect(() => {
		startInputListening();
		return () => stopInputListening();
	}, []);

	useFrame(() => {
		const now = performance.now();
		const frameDtMs = Math.min(now - lastTimeRef.current, 50);
		lastTimeRef.current = now;
		accumulatorRef.current += frameDtMs;

		if (!localRole) return;
		if (document.hidden) return;
		if (accumulatorRef.current < CLIENT_TICK_INTERVAL_MS) return;

		const dtMs = Math.min(accumulatorRef.current, 66);
		accumulatorRef.current = 0;

		const input = buildInputFrame(inputSeq++, dtMs);

		// Only send input if there's movement or sprint
		if (input.dirX !== 0 || input.dirZ !== 0 || input.sprint) {
			if (input.dirX !== 0 || input.dirZ !== 0) {
				onLocalFacingUpdate(
					Math.atan2(input.dirX, input.dirZ),
				);
			}
			const predicted = predictionBuffer.applyInput(input);
			setLocalTransform({
				x: predicted.x,
				z: predicted.z,
				stamina: predicted.stamina,
			});
			sendInput(room, input);
		}
	});

	return null;
}

export function Scene({ room }: SceneProps) {
	const { localRole, localTransform, remotePlayers, phase } =
		useGameStore();
	const localFacingRef = useRef(0);

	useEffect(() => {
		// Reset prediction buffer on mount
		inputSeq = 1;
		predictionBuffer.reset(0, 0, 100, true);
	}, []);

	// Listen to server state updates for reconciliation
	useEffect(() => {
		if (!room) return;

		const handleStateChange = () => {
			const state = room.state as
				| GameRoomStateSnapshot
				| undefined;
			if (!state?.players) return;
			const currentLocalSessionId =
				useGameStore.getState().localSessionId;
			const seenRemoteSessionIds = new Set<string>();

			state.players.forEach((player, sessionId) => {
				if (sessionId === currentLocalSessionId) {
					// Reconcile local player
					predictionBuffer.reconcile(
						{
							x: player.x,
							z: player.z,
							stamina: player.stamina,
							sprintReady: player.sprintReady,
						},
						player.lastProcessedInputSeq,
					);
					const reconciled =
						predictionBuffer.getState();
					useGameStore
						.getState()
						.setLocalTransform({
							x: reconciled.x,
							z: reconciled.z,
							stamina: reconciled.stamina,
							sprintReady: reconciled.sprintReady,
						});
				} else {
					seenRemoteSessionIds.add(sessionId);
					// Update remote player
					useGameStore
						.getState()
						.updateRemotePlayer({
							sessionId,
							userId: player.userId,
							email: player.email,
							role: player.role,
							x: player.x,
							z: player.z,
							stamina: player.stamina,
							connected: player.connected,
						});
				}
			});

			const currentRemotePlayers =
				useGameStore.getState().remotePlayers;
			currentRemotePlayers.forEach((_player, sessionId) => {
				if (!seenRemoteSessionIds.has(sessionId)) {
					useGameStore
						.getState()
						.removeRemotePlayer(sessionId);
				}
			});
		};

		room.onStateChange(handleStateChange);
		return () => {
			room.onStateChange.remove(handleStateChange);
		};
	}, [room]);

	const isRunning = phase === "RUNNING";

	return (
		<>
			<color attach="background" args={["#080810"]} />
			<fog attach="fog" args={["#080810", 18, 42]} />
			<CameraRig />
			<Lights />
			<Arena />

			{/* Local player */}
			{localRole && (
				<PlayerMesh
					x={localTransform.x}
					z={localTransform.z}
					role={localRole as "HUNTER" | "RUNNER"}
					isLocal={true}
					facingOverrideRef={localFacingRef}
				/>
			)}

			{/* Remote players */}
			{Array.from(remotePlayers.values()).map((p) => (
				<PlayerMesh
					key={p.sessionId}
					x={p.x}
					z={p.z}
					role={p.role as "HUNTER" | "RUNNER"}
					isLocal={false}
				/>
			))}

			{isRunning && (
				<GameLoop
					room={room}
					onLocalFacingUpdate={(facingRad) => {
						localFacingRef.current =
							facingRad;
					}}
				/>
			)}

			{ENABLE_POSTPROCESSING ? (
				<EffectComposer>
					<Bloom
						intensity={1.2}
						luminanceThreshold={0.3}
						luminanceSmoothing={0.9}
						mipmapBlur
					/>
				</EffectComposer>
			) : null}
		</>
	);
}
