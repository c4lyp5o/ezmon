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
import { Plus } from "lucide-react";

const MAX_NAME_LENGTH = 50;

const addSiteAction = async (_prevState, formData) => {
	"use server";

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
		} catch (e) {
			console.error(e);
			return {
				message:
					"Invalid URL. Please enter a full URL (e.g., https://example.com)",
				error: true,
			};
		}

		// console.log("submitting");
		// console.log(formData.get("hideUrl"));
		const hideUrlStatus = formData.get("hideUrl") === "on";
		// console.log(hideUrlStatus);
		formData.set("hideUrl", hideUrlStatus);

		const res = await fetch("/api/v1/mon", {
			method: "POST",
			body: formData,
		});

		if (!res.ok) {
			const payload = await res.json();
			return { message: payload.message, error: true };
		}

		const payload = await res.json();
		return { message: payload.message, error: false };
	} catch (err) {
		console.error("Reply failed:", err);
		return { message: "An unexpected error occurred.", error: true };
	}
};

const AddSiteModal = () => {
	const [open, setOpen] = useState(false);

	const nameId = useId();
	const urlId = useId();
	const passwordId = useId();
	const hideUrlId = useId();

	const [state, formAction, isPending] = useActionState(
		async (prev, formData) => {
			const result = await addSiteAction(prev, formData);
			if (!result.error) setOpen(false);
			return result;
		},
		{ message: "" },
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="mr-2 h-4 w-4" /> Add Site
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<form action={formAction}>
					<DialogHeader>
						<DialogTitle>Add New Site</DialogTitle>
						<DialogDescription>
							Enter the details for the site you want to monitor.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="name" className="text-right">
								Name
							</Label>
							<Input
								id={nameId}
								name="name"
								placeholder="e.g., My Blog"
								className="col-span-3"
								required
							/>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="site" className="text-right">
								URL
							</Label>
							<Input
								id={urlId}
								name="url"
								placeholder="https://example.com"
								className="col-span-3"
								required
							/>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="password" className="text-right">
								Password
							</Label>
							<Input
								id={passwordId}
								name="password"
								type="password"
								placeholder="Monitoring API Key"
								className="col-span-3"
								required
							/>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="hideUrl" className="text-right">
								Hide URL
							</Label>
							<Switch id={hideUrlId} name="hideUrl" className="col-span-3" />
						</div>
					</div>
					{state.message && (
						<div
							className={cn(
								"text-sm text-center py-2 mb-2",
								state.error ? "text-destructive" : "text-green-600",
							)}
						>
							{state.message}
						</div>
					)}

					<DialogFooter>
						<Button type="submit" disabled={isPending}>
							Add Site
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default AddSiteModal;
