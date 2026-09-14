import { Badge } from "@/components/ui/badge";

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function FollowUpBadge({ followUpDate }: { followUpDate: string | null }) {
  if (!followUpDate) return null;

  const diff = daysUntil(followUpDate);
  if (diff > 3) return null;

  const label =
    diff < 0
      ? `Overdue ${Math.abs(diff)}d`
      : diff === 0
        ? "Follow up today"
        : `Follow up in ${diff}d`;

  return (
    <Badge variant={diff <= 0 ? "destructive" : "secondary"} className="whitespace-nowrap">
      {label}
    </Badge>
  );
}
