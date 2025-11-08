import { Elysia, t } from "elysia";

import Site from "../models/Site";
import Heartbeat from "../models/Heartbeat";

const monModule = new Elysia({ prefix: "/api/v1/mon" })
	.get("/", async () => {
		const sites = await Site.find().populate("heartbeats");
		return sites;
	})
	.onBeforeHandle(({ body: { password }, status }) => {
		if (password !== process.env.API_KEY)
			return status(401, { message: "Unauthorized" });
	})
	.post(
		"/",
		async ({ body: { name, url, hideUrl }, status }) => {
			try {
				await Site.create({ name, url, hideUrl });
				return { message: "Site added successfully" };
			} catch (error) {
				console.error(error);
				status(500, { message: "Internal server error" });
			}
		},
		{
			body: t.Object({
				name: t.String(),
				url: t.String(),
				password: t.String(),
				hideUrl: t.Optional(t.String()),
			}),
		},
	)
	.delete(
		"/",
		async ({ body: { id }, status }) => {
			try {
				const deletedSite = await Site.findByIdAndDelete(id);
				if (!deletedSite) return status(404, { message: "Site not found" });
				await Heartbeat.deleteMany({ site: deletedSite._id });
				return { message: "Site deleted successfully" };
			} catch (error) {
				console.error(error);
				status(500, { message: "Internal server error" });
			}
		},
		{
			body: t.Object({
				id: t.String(),
				password: t.String(),
			}),
		},
	);

export default monModule;
