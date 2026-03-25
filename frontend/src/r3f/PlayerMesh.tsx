import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

interface PlayerMeshProps {
	x: number;
	z: number;
	role: "HUNTER" | "RUNNER";
	isLocal?: boolean;
	facingOverrideRef?: MutableRefObject<number>;
}

const HUNTER_COLOR = "#ff5010";
const RUNNER_COLOR = "#00dcff";

function shortestAngleDelta(current: number, target: number): number {
	let delta = target - current;
	while (delta > Math.PI) delta -= Math.PI * 2;
	while (delta < -Math.PI) delta += Math.PI * 2;
	return delta;
}

export function PlayerMesh({
	x,
	z,
	role,
	isLocal = false,
	facingOverrideRef,
}: PlayerMeshProps) {
	const rootRef = useRef<Group>(null!);
	const leftArmRef = useRef<Group>(null!);
	const rightArmRef = useRef<Group>(null!);
	const leftLegRef = useRef<Group>(null!);
	const rightLegRef = useRef<Group>(null!);
	const prevPosRef = useRef({ x, z });
	const facingRef = useRef(0);
	const stridePhaseRef = useRef(0);
	const movementAlphaRef = useRef(0);
	const color = role === "HUNTER" ? HUNTER_COLOR : RUNNER_COLOR;
	const clothingColor = role === "HUNTER" ? "#2e1512" : "#0f1a2b";

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

		if (facingOverrideRef) {
			// Local player should follow input direction, not reconciliation nudges.
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
			delta * (2 + movementAlphaRef.current * 8);
		const swing =
			Math.sin(stridePhaseRef.current) *
			(0.75 * movementAlphaRef.current);
		const counterSwing = -swing;
		const bob =
			Math.abs(Math.sin(stridePhaseRef.current * 2)) *
			0.06 *
			movementAlphaRef.current;

		rootRef.current.position.y = bob;

		if (leftArmRef.current)
			leftArmRef.current.rotation.x = counterSwing;
		if (rightArmRef.current) rightArmRef.current.rotation.x = swing;
		if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
		if (rightLegRef.current)
			rightLegRef.current.rotation.x = counterSwing;

		prevPosRef.current = { x: target.x, z: target.z };
	});

	return (
		<group ref={rootRef} position={[x, 0, z]}>
			{/* Body core */}
			<mesh position={[0, 1.05, 0]} castShadow>
				<capsuleGeometry args={[0.26, 0.72, 8, 12]} />
				<meshStandardMaterial
					color={clothingColor}
					roughness={0.45}
					metalness={0.25}
				/>
			</mesh>

			{/* Chest plate accent */}
			<mesh position={[0, 1.08, 0.22]} castShadow>
				<boxGeometry args={[0.3, 0.34, 0.08]} />
				<meshStandardMaterial
					color={color}
					emissive={color}
					emissiveIntensity={isLocal ? 1.8 : 1.1}
					roughness={0.35}
					metalness={0.4}
				/>
			</mesh>

			{/* Head */}
			<mesh position={[0, 1.72, 0]} castShadow>
				<sphereGeometry args={[0.2, 14, 12]} />
				<meshStandardMaterial
					color="#d6d9e8"
					roughness={0.5}
					metalness={0.05}
				/>
			</mesh>

			{/* Visor */}
			<mesh position={[0, 1.7, 0.16]} castShadow>
				<boxGeometry args={[0.22, 0.08, 0.06]} />
				<meshStandardMaterial
					color={color}
					emissive={color}
					emissiveIntensity={1.9}
					roughness={0.2}
					metalness={0.55}
				/>
			</mesh>

			{/* Arms */}
			<group ref={leftArmRef} position={[-0.28, 1.35, 0]}>
				<mesh castShadow position={[0, -0.24, 0]}>
					<capsuleGeometry
						args={[0.08, 0.42, 6, 10]}
					/>
					<meshStandardMaterial
						color="#b8bfd9"
						roughness={0.5}
						metalness={0.08}
					/>
				</mesh>
			</group>
			<group ref={rightArmRef} position={[0.28, 1.35, 0]}>
				<mesh castShadow position={[0, -0.24, 0]}>
					<capsuleGeometry
						args={[0.08, 0.42, 6, 10]}
					/>
					<meshStandardMaterial
						color="#b8bfd9"
						roughness={0.5}
						metalness={0.08}
					/>
				</mesh>
			</group>

			{/* Legs */}
			<group ref={leftLegRef} position={[-0.12, 0.66, 0]}>
				<mesh castShadow position={[0, -0.31, 0]}>
					<capsuleGeometry
						args={[0.09, 0.56, 6, 10]}
					/>
					<meshStandardMaterial
						color="#666d87"
						roughness={0.65}
						metalness={0.1}
					/>
				</mesh>
			</group>
			<group ref={rightLegRef} position={[0.12, 0.66, 0]}>
				<mesh castShadow position={[0, -0.31, 0]}>
					<capsuleGeometry
						args={[0.09, 0.56, 6, 10]}
					/>
					<meshStandardMaterial
						color="#666d87"
						roughness={0.65}
						metalness={0.1}
					/>
				</mesh>
			</group>

			{/* Team ring on ground */}
			<mesh
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, 0.03, 0]}
			>
				<torusGeometry args={[0.42, 0.03, 10, 36]} />
				<meshStandardMaterial
					color={color}
					emissive={color}
					emissiveIntensity={isLocal ? 2.2 : 1.2}
					roughness={0.25}
					metalness={0.35}
				/>
			</mesh>
		</group>
	);
}
