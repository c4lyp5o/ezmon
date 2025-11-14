module.exports = {
	apps: [
		{
			name: "server",
			script: "./src/server.js",
			interpreter: "bun",
			instances: "max",
			exec_mode: "cluster",
			autorestart: true,
			watch: false,
			env: {
				NODE_ENV: "development",
				PORT: 5000,
			},
			env_production: {
				NODE_ENV: "production",
				PORT: 5000,
			},
		},
		{
			name: "worker",
			script: "./src/worker.js",
			interpreter: "bun",
			instances: 1,
			exec_mode: "fork",
			autorestart: true,
			watch: false,
			env: {
				NODE_ENV: "development",
			},
			env_production: {
				NODE_ENV: "production",
			},
		},
	],
};
