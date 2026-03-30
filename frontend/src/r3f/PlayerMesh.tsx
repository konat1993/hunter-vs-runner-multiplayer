import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { WALK_SPEED } from "../game/constants";

interface PlayerMeshProps {
	x: number;
	z: number;
	role: "HUNTER" | "RUNNER";
	isLocal?: boolean;
	facingOverrideRef?: MutableRefObject<number>;
}

const HUNTER_COLOR = "#ff6030";
const RUNNER_COLOR = "#40e8ff";

function shortestAngleDelta(current: number, target: number): number {
	let delta = target - current;
	while (delta > Math.PI) delta -= Math.PI * 2;
	while (delta < -Math.PI) delta += Math.PI * 2;
	return delta;
}

/** Speed above this (m/s) blends in forward lean — between walk and sprint. */
const SPRINT_LEAN_START = WALK_SPEED + 0.6;
const SPRINT_LEAN_END = WALK_SPEED + 3.2;
const MAX_FORWARD_LEAN = 0.22;

export function PlayerMesh({
	x,
	z,
	role,
	isLocal = false,
	facingOverrideRef,
}: PlayerMeshProps) {
	const rootRef = useRef<Group>(null!);
	const leanRef = useRef<Group>(null!);
	const leftArmRef = useRef<Group>(null!);
	const rightArmRef = useRef<Group>(null!);
	const leftLegRef = useRef<Group>(null!);
	const rightLegRef = useRef<Group>(null!);
	const prevPosRef = useRef({ x, z });
	const facingRef = useRef(0);
	const stridePhaseRef = useRef(0);
	const movementAlphaRef = useRef(0);
	const sprintLeanRef = useRef(0);

	const accent = role === "HUNTER" ? HUNTER_COLOR : RUNNER_COLOR;
	const shirt =
		role === "HUNTER" ? "#d85830" : "#2f8fd4";
	const pants = role === "HUNTER" ? "#4a3228" : "#2a4a6a";
	const skinTone = "#f0e8e0";
	const hairColor =
		role === "HUNTER" ? "#f2e0b8" : "#6b4423";

	useEffect(() => {
		stridePhaseRef.current = Math.random() * Math.PI * 2;
	}, []);

	useFrame((_, delta) => {
		if (!rootRef.current) return;
		const target = rootRef.current.position;

		const targetX = x;
		const targetZ = z;
		if (isLocal) {
			target.x = targetX;
			target.z = targetZ;
		} else {
			target.x += (targetX - target.x) * 0.22;
			target.z += (targetZ - target.z) * 0.22;
		}

		const dx = target.x - prevPosRef.current.x;
		const dz = target.z - prevPosRef.current.z;
		const speed =
			Math.sqrt(dx * dx + dz * dz) / Math.max(0.0001, delta);
		const moveAlphaTarget = Math.min(1, speed / 4.5);
		movementAlphaRef.current +=
			(moveAlphaTarget - movementAlphaRef.current) * 0.25;

		let sprintT = 0;
		if (speed > SPRINT_LEAN_START && movementAlphaRef.current > 0.15) {
			sprintT = Math.min(
				1,
				Math.max(
					0,
					(speed - SPRINT_LEAN_START) /
						(SPRINT_LEAN_END - SPRINT_LEAN_START),
				),
			);
		}
		sprintLeanRef.current +=
			(sprintT * movementAlphaRef.current - sprintLeanRef.current) *
			0.18;

		if (facingOverrideRef) {
			facingRef.current = facingOverrideRef.current;
		} else if (speed > 0.02) {
			facingRef.current = Math.atan2(dx, dz);
		}
		const deltaAngle = shortestAngleDelta(
			rootRef.current.rotation.y,
			facingRef.current,
		);
		rootRef.current.rotation.y += deltaAngle * 0.25;

		stridePhaseRef.current +=
			delta * (2 + movementAlphaRef.current * 10);
		const swing =
			Math.sin(stridePhaseRef.current) *
			(0.78 * movementAlphaRef.current);
		const counterSwing = -swing;
		const bob =
			Math.abs(Math.sin(stridePhaseRef.current * 2)) *
			(0.05 + 0.035 * sprintLeanRef.current) *
			movementAlphaRef.current;

		rootRef.current.position.y = bob;

		if (leanRef.current) {
			const lean =
				MAX_FORWARD_LEAN *
				sprintLeanRef.current *
				Math.min(1, movementAlphaRef.current * 1.2);
			leanRef.current.rotation.x = lean;
		}

		if (leftArmRef.current)
			leftArmRef.current.rotation.x = counterSwing;
		if (rightArmRef.current) rightArmRef.current.rotation.x = swing;
		if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
		if (rightLegRef.current)
			rightLegRef.current.rotation.x = counterSwing;

		prevPosRef.current = { x: target.x, z: target.z };
	});

	const chestY = 1.14;
	const headY = 1.82;

	return (
		<group ref={rootRef} position={[x, 0, z]}>
			{/* Ground ring — stays upright (no lean) for a clear floor read */}
			<mesh
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, 0.03, 0]}
			>
				<torusGeometry args={[0.46, 0.032, 10, 40]} />
				<meshStandardMaterial
					color={accent}
					emissive={accent}
					emissiveIntensity={isLocal ? 2.35 : 1.55}
					roughness={0.22}
					metalness={0.38}
				/>
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.028, 0]}>
				<ringGeometry args={[0.38, 0.5, 32]} />
				<meshBasicMaterial
					color={accent}
					transparent
					opacity={0.22}
					depthWrite={false}
				/>
			</mesh>

			<group ref={leanRef}>
				<mesh position={[0, 0.94, 0]} castShadow>
					<capsuleGeometry args={[0.24, 0.2, 6, 10]} />
					<meshStandardMaterial
						color={pants}
						roughness={0.55}
						metalness={0.12}
					/>
				</mesh>

				<mesh position={[0, chestY, 0]} castShadow>
					<capsuleGeometry args={[0.24, 0.58, 8, 14]} />
					<meshStandardMaterial
						color={shirt}
						roughness={0.48}
						metalness={0.08}
						emissive={accent}
						emissiveIntensity={0.08}
					/>
				</mesh>

				<mesh position={[0, chestY + 0.02, 0.18]} castShadow>
					<boxGeometry args={[0.24, 0.3, 0.08]} />
					<meshStandardMaterial
						color={accent}
						emissive={accent}
						emissiveIntensity={isLocal ? 1.35 : 0.95}
						roughness={0.32}
						metalness={0.38}
					/>
				</mesh>

				<mesh position={[0, 1.52, 0.12]} castShadow>
					<cylinderGeometry args={[0.1, 0.1, 0.14, 10]} />
					<meshStandardMaterial
						color={skinTone}
						roughness={0.5}
						metalness={0.04}
					/>
				</mesh>

				<mesh position={[0, headY, 0]} castShadow scale={[1, 1.06, 0.94]}>
					<sphereGeometry args={[0.18, 20, 16]} />
					<meshStandardMaterial
						color={skinTone}
						roughness={0.45}
						metalness={0.05}
					/>
				</mesh>

				<mesh position={[0, headY + 0.12, 0]} castShadow scale={[1.05, 0.55, 1.05]}>
					<sphereGeometry args={[0.19, 14, 12]} />
					<meshStandardMaterial
						color={hairColor}
						roughness={0.85}
						metalness={0.02}
					/>
				</mesh>

				<mesh position={[-0.06, headY + 0.02, 0.15]} castShadow>
					<sphereGeometry args={[0.028, 8, 8]} />
					<meshStandardMaterial color="#1a1a22" roughness={0.4} />
				</mesh>
				<mesh position={[0.06, headY + 0.02, 0.15]} castShadow>
					<sphereGeometry args={[0.028, 8, 8]} />
					<meshStandardMaterial color="#1a1a22" roughness={0.4} />
				</mesh>

				<group ref={leftArmRef} position={[-0.32, 1.36, 0]}>
					<mesh castShadow position={[0, -0.24, 0]}>
						<capsuleGeometry args={[0.075, 0.42, 6, 10]} />
						<meshStandardMaterial
							color={shirt}
							roughness={0.5}
							metalness={0.08}
						/>
					</mesh>
					<mesh castShadow position={[0, -0.48, 0.01]}>
						<boxGeometry args={[0.1, 0.1, 0.08]} />
						<meshStandardMaterial
							color={skinTone}
							roughness={0.52}
							metalness={0.04}
						/>
					</mesh>
				</group>
				<group ref={rightArmRef} position={[0.32, 1.36, 0]}>
					<mesh castShadow position={[0, -0.24, 0]}>
						<capsuleGeometry args={[0.075, 0.42, 6, 10]} />
						<meshStandardMaterial
							color={shirt}
							roughness={0.5}
							metalness={0.08}
						/>
					</mesh>
					<mesh castShadow position={[0, -0.48, 0.01]}>
						<boxGeometry args={[0.1, 0.1, 0.08]} />
						<meshStandardMaterial
							color={skinTone}
							roughness={0.52}
							metalness={0.04}
						/>
					</mesh>
				</group>

				<group ref={leftLegRef} position={[-0.1, 0.74, 0]}>
					<mesh castShadow position={[0, -0.32, 0]}>
						<capsuleGeometry args={[0.09, 0.54, 6, 10]} />
						<meshStandardMaterial
							color={pants}
							roughness={0.58}
							metalness={0.1}
						/>
					</mesh>
					<mesh castShadow position={[0, -0.62, 0.04]}>
						<boxGeometry args={[0.12, 0.08, 0.2]} />
						<meshStandardMaterial
							color="#2a2420"
							roughness={0.7}
							metalness={0.15}
						/>
					</mesh>
				</group>
				<group ref={rightLegRef} position={[0.1, 0.74, 0]}>
					<mesh castShadow position={[0, -0.32, 0]}>
						<capsuleGeometry args={[0.09, 0.54, 6, 10]} />
						<meshStandardMaterial
							color={pants}
							roughness={0.58}
							metalness={0.1}
						/>
					</mesh>
					<mesh castShadow position={[0, -0.62, 0.04]}>
						<boxGeometry args={[0.12, 0.08, 0.2]} />
						<meshStandardMaterial
							color="#2a2420"
							roughness={0.7}
							metalness={0.15}
						/>
					</mesh>
				</group>
			</group>
		</group>
	);
}
