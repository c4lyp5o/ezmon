import { Loader2 } from "lucide-react";

const Loading = () => {
	return (
		<div className="flex justify-center items-center h-screen">
			<Loader2 className="h-10 w-10 animate-spin text-primary" />
		</div>
	);
};

export default Loading;
