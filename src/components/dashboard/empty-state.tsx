import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  type: "no-data" | "no-fy-data" | "no-sales";
  fyLabel?: string;
}

export function EmptyState({ type, fyLabel }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        {type === "no-data" && (
          <p>
            No data imported yet.{" "}
            <a href="/import" className="text-primary underline">
              Go to Import
            </a>
          </p>
        )}
        {type === "no-fy-data" && (
          <p>No events in {fyLabel ?? "this year"}. Try selecting a different financial year.</p>
        )}
        {type === "no-sales" && (
          <p>No sales data imported. Import a Sales CSV to see capital gains.</p>
        )}
      </CardContent>
    </Card>
  );
}
