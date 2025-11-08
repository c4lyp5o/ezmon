module.exports = {
	apps: [
		{
			name: "api-server",
			script: "./src/server.js",
			interpreter: "bun",

			env_dev: {
				NODE_ENV: "development",
				PORT: 5000,
			},
			env_prod: {
				NODE_ENV: "production",
				PORT: 5000,
				instances: "max",
				exec_mode: "cluster",
			},
		},
		{
			// --- Your Background Worker ---
			name: "fanout-worker",
			script: "./src/worker.js",
			interpreter: "bun",

			instances: 1,
			exec_mode: "fork",

			// --- Environment-Specific Settings ---
			env_dev: {
				NODE_ENV: "development",
			},
			env_prod: {
				NODE_ENV: "production",
			},
		},
	],
};
