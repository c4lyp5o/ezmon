import { useState, useId } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DeleteSiteModal = ({ siteName, open, onOpenChange, onConfirm }) => {
	const [password, setPassword] = useState("");
	const [isPending, setIsPending] = useState(false);

	const passwordId = useId();

	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsPending(true);
		try {
			await onConfirm(password);
		} catch (error) {
			console.error("Deletion failed", error);
		} finally {
			setIsPending(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Delete Site</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete{" "}
							<span className="font-bold">{siteName}</span>? This action cannot
							be undone.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
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
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>
					</div>

					<DialogFooter>
						<Button type="submit" variant="destructive" disabled={isPending}>
							{isPending ? "Deleting..." : "Delete Site"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default DeleteSiteModal;
