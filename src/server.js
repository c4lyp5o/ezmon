import { Elysia, file } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { openapi } from "@elysiajs/openapi";
import mongoose from "mongoose";

import monModule from "./modules/mon";

import logger from "./utils/logger";

const startServer = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		logger.success("🌿 Connected to MongoDB");
	} catch (error) {
		logger.error("Failed to connect to MongoDB", error);
		process.exit(1);
	}

	const PORT = process.env.PORT || 5000;

	const app = new Elysia()
		.use(
			staticPlugin({
				assets: "./dist",
				prefix: "",
				fallback: "index.html",
			}),
		)
		.get("/", () => file("./dist/index.html"))
		.use(openapi())
		.use(monModule)
		.get("*", ({ status }) => {
			status(404, { message: "Not found" });
		});

	try {
		app.listen(PORT);
		logger.info(
			`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
		);
	} catch (error) {
		logger.error(JSON.stringify(error));
		process.exit(1);
	}
};

startServer();
