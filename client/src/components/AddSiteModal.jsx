import { useState, useId, useActionState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

const MAX_NAME_LENGTH = 50;
const METHODS = ["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE"];

const addSiteAction = async (_prevState, formData) => {
	try {
		if (
			!formData.get("name").trim() ||
			!formData.get("url").trim() ||
			!formData.get("password").trim()
		) {
			return { message: "Name/URL/password cannot be empty", error: true };
		}
		if (formData.get("name").length > MAX_NAME_LENGTH) {
			return { message: "Name is too long", error: true };
		}
		try {
			new URL(formData.get("url"));
		} catch {
			return { message: "Invalid URL", error: true };
		}

		const hideUrl = formData.get("hideUrl") === "on";
		const interval = Math.max(15, Number(formData.get("interval") || 60));

		const check = {
			method: formData.get("method") || "GET",
			expectedStatus: Number(formData.get("expectedStatus") || 200),
			timeoutMs: Number(formData.get("timeoutMs") || 5000),
			ssl: formData.get("ssl") === "on",
		};

		const alerts = {
			telegram: formData.get("alertTelegram") === "on",
			discord: formData.get("alertDiscord") === "on",
			slack: formData.get("alertSlack") === "on",
		};

		const payload = {
			name: formData.get("name"),
			url: formData.get("url"),
			password: formData.get("password"),
			hideUrl,
			interval,
			check,
			alerts,
		};

		const res = await fetch("/api/v1/mon", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		const data = await res.json();
		if (!res.ok) return { message: data.message, error: true };
		return { message: data.message, error: false };
	} catch (err) {
		console.error("add site failed:", err);
		return { message: "An unexpected error occurred.", error: true };
	}
};

const AddSiteModal = ({ onAdd, theme }) => {
	const [open, setOpen] = useState(false);

	const ids = {
		name: useId(),
		url: useId(),
		password: useId(),
		hideUrl: useId(),
		interval: useId(),
		method: useId(),
		expectedStatus: useId(),
		timeoutMs: useId(),
		ssl: useId(),
		telegram: useId(),
		discord: useId(),
		slack: useId(),
	};

	const [state, formAction, isPending] = useActionState(async (prev, formData) => {
		const result = await addSiteAction(prev, formData);
		if (!result.error) {
			setOpen(false);
			onAdd?.();
		}
		return result;
	}, { message: "" });

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="mr-2 h-4 w-4" /> Add Site
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
				<form action={formAction}>
					<DialogHeader>
						<DialogTitle>Add New Site</DialogTitle>
						<DialogDescription>
							Enter the details for the site you want to monitor.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={ids.name} className="text-right">Name</Label>
							<Input id={ids.name} name="name" placeholder="e.g., My Blog" className="col-span-3" required />
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={ids.url} className="text-right">URL</Label>
							<Input id={ids.url} name="url" placeholder="https://example.com" className="col-span-3" required />
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={ids.password} className="text-right">Password</Label>
							<Input id={ids.password} name="password" type="password" placeholder="Monitoring API Key" className="col-span-3" required />
						</div>

						{/* Advanced options */}
						<div className="col-span-4 border-t pt-4">
							<p className="text-sm font-semibold text-muted-foreground mb-3">Options</p>
						</div>

						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={ids.interval} className="text-right">Interval (s)</Label>
							<Input id={ids.interval} name="interval" type="number" min="15" step="5" defaultValue="60" className="col-span-3" />
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={ids.method} className="text-right">Method</Label>
							<Select name="method" defaultValue="GET">
								<SelectTrigger className="col-span-3 w-full" id={ids.method}>
									<SelectValue placeholder="GET" />
								</SelectTrigger>
								<SelectContent>
									{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={ids.expectedStatus} className="text-right">Expected Status</Label>
							<Input id={ids.expectedStatus} name="expectedStatus" type="number" min="100" max="599" defaultValue="200" className="col-span-3" />
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={ids.timeoutMs} className="text-right">Timeout (ms)</Label>
							<Input id={ids.timeoutMs} name="timeoutMs" type="number" min="1000" max="60000" step="1000" defaultValue="5000" className="col-span-3" />
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={ids.hideUrl} className="text-right">Hide URL</Label>
							<Switch id={ids.hideUrl} name="hideUrl" className="col-span-3" />
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={ids.ssl} className="text-right">SSL Monitoring</Label>
							<Switch id={ids.ssl} name="ssl" className="col-span-3" />
						</div>

						{/* Alerts */}
						<div className="col-span-4 border-t pt-4">
							<p className="text-sm font-semibold text-muted-foreground mb-3">Alerts</p>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={ids.telegram} className="text-right">Telegram</Label>
							<Switch id={ids.telegram} name="alertTelegram" className="col-span-3" />
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={ids.discord} className="text-right">Discord</Label>
							<Switch id={ids.discord} name="alertDiscord" className="col-span-3" />
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={ids.slack} className="text-right">Slack</Label>
							<Switch id={ids.slack} name="alertSlack" className="col-span-3" />
						</div>
					</div>

					{state.message && (
						<div className={cn("text-sm text-center py-2 mb-2", state.error ? "text-destructive" : "text-green-600")}>
							{state.message}
						</div>
					)}

					<DialogFooter>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Adding..." : "Add Site"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default AddSiteModal;