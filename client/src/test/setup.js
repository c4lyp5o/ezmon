import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach } from "vitest";

// Animations add nothing to a DOM test and happy-dom aborts them noisily.
MotionGlobalConfig.skipAnimations = true;

afterEach(cleanup);

// happy-dom has no matchMedia; the ez motion kit reads prefers-reduced-motion.
if (!window.matchMedia) {
	window.matchMedia = (query) => ({
		matches: false,
		media: query,
		addEventListener() {},
		removeEventListener() {},
		addListener() {},
		removeListener() {},
	});
}
