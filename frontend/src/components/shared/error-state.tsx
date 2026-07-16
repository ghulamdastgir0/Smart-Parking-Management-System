import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-16 text-center">
      <AlertCircle className="size-8 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium">Something went wrong</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {getApiErrorMessage(error)}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          <RotateCw className="size-4" /> Retry
        </Button>
      )}
    </div>
  );
}
