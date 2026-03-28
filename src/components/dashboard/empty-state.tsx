import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  type: "no-data" | "no-fy-data" | "no-sales";
  fyLabel?: string;
}

const messages = {
  "no-data": {
    text: "No data imported yet.",
    linkHref: "/import",
    linkText: "Go to Import",
  },
  "no-fy-data": {
    text: (fy: string) => `No events in ${fy}. Try selecting a different financial year.`,
  },
  "no-sales": {
    text: "No sales data imported. Import a Sales CSV to see capital gains.",
  },
} as const;

export function EmptyState({ type, fyLabel }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        {type === "no-data" && (
          <p>
            {messages["no-data"].text}{" "}
            <a href="/import" className="text-primary underline">
              Go to Import
            </a>
          </p>
        )}
        {type === "no-fy-data" && (
          <p>{messages["no-fy-data"].text(fyLabel ?? "this year")}</p>
        )}
        {type === "no-sales" && <p>{messages["no-sales"].text}</p>}
      </CardContent>
    </Card>
  );
}
