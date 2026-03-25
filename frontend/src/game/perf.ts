// Adaptive defaults: preserve visual quality on strong devices and
// reduce load on weaker laptops where frame pacing drops.
const nav =
	typeof navigator !== "undefined"
		? (navigator as Navigator & {
				deviceMemory?: number;
			})
		: undefined;
const hardwareConcurrency =
	nav?.hardwareConcurrency ?? 8;
const deviceMemory =
	typeof nav?.deviceMemory === "number"
		? nav.deviceMemory
		: 8;

const isLowSpecDevice =
	hardwareConcurrency <= 4 || deviceMemory <= 4;

export const RENDERER_DPR_MAX = isLowSpecDevice
	? 1.25
	: 2;
export const ENABLE_POSTPROCESSING = !isLowSpecDevice;
export const CLIENT_TICK_HZ = isLowSpecDevice ? 30 : 60;
export const RENDERER_ANTIALIAS = !isLowSpecDevice;
export const RENDERER_POWER_PREFERENCE: WebGLPowerPreference =
	isLowSpecDevice
		? "low-power"
		: "high-performance";
