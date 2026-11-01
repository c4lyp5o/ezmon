import { Screen } from "@/ez/motion";
import { btn, cx, Notice } from "@/ez/ui";

const ErrorPage = ({ message }) => (
	<div className="flex h-dvh items-center justify-center px-4">
		<Screen className="w-full max-w-md">
			<Notice tone="bad">
				<div className="font-medium">Could not load the monitors</div>
				<div className="mt-0.5 text-[12px] text-mute">{message || "An unexpected error occurred."}</div>
				<button type="button" onClick={() => window.location.reload()} className={cx(btn.sm, btn.ghost, "mt-3")}>
					Try again
				</button>
			</Notice>
		</Screen>
	</div>
);

export default ErrorPage;
