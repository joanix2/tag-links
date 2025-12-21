import { GraphStats } from "./types";

interface StatItemProps {
  color: string;
  value: number;
  label: string;
  isEdge?: boolean;
}

const StatItem = ({ color, value, label, isEdge = false }: StatItemProps) => (
  <div className="flex items-center gap-2 text-xs">
    <div className={`w-4 h-4 ${isEdge ? "flex items-center justify-center" : "rounded-full shadow"}`} style={!isEdge ? { backgroundColor: color } : undefined}>
      {isEdge && <div className="w-3 h-0.5" style={{ backgroundColor: color }}></div>}
    </div>
    <span className="font-medium">{value}</span>
    <span className="text-muted-foreground">{label}</span>
  </div>
);

interface GraphOverviewProps {
  stats: GraphStats;
}

export const GraphOverview = ({ stats }: GraphOverviewProps) => {
  return (
    <div className="space-y-2 mb-4">
      <div className="font-semibold text-sm border-b pb-2">Graph Overview</div>
      <StatItem color="#3b82f6" value={stats.linksCount} label="Links" />
      <StatItem color="#94a3b8" value={stats.tagsCount} label="Tags" />
      <StatItem color="#94a3b8" value={stats.relationsCount} label="Relations" isEdge />
    </div>
  );
};
