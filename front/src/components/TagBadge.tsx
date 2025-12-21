import { Tag } from "@/types";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  tag: Tag;
  isSelected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
  showIcon?: boolean;
}

const TagBadge = ({ tag, isSelected = false, onClick, size = "md", showIcon = false }: TagBadgeProps) => {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <div
      onClick={onClick}
      style={{ backgroundColor: tag.color }}
      className={cn(
        "rounded-md font-medium shadow-sm cursor-pointer border border-white/20 transition-all text-white",
        sizeStyles[size],
        isSelected && "ring-1 ring-white/50",
        onClick && "hover:brightness-90 active:scale-95"
      )}
    >
      <div className="flex items-center gap-1.5">
        {showIcon && <div className="w-2 h-2 rounded-full bg-white/70" />}
        <span>{tag.name}</span>
      </div>
    </div>
  );
};

export default TagBadge;
