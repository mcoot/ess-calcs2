import { Button } from "@/components/ui/button";

interface FySelectorProps {
  availableFys: string[];
  selectedFy: string;
  onSelect: (fy: string) => void;
}

export function FySelector({ availableFys, selectedFy, onSelect }: FySelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedFy === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect("all")}
      >
        All
      </Button>
      {availableFys.map((fy) => (
        <Button
          key={fy}
          variant={selectedFy === fy ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(fy)}
        >
          {fy}
        </Button>
      ))}
    </div>
  );
}
