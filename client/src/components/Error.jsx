import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ErrorPage = ({ message }) => {
	return (
		<div className="flex justify-center items-center h-screen">
			<Alert variant="destructive" className="max-w-md">
				<AlertCircle className="h-4 w-4" />
				<AlertTitle>Error</AlertTitle>
				<AlertDescription>
					{message || "An unexpected error occurred."}
				</AlertDescription>
			</Alert>
		</div>
	);
};

export default ErrorPage;
