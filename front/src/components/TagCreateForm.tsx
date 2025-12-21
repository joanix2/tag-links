import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const DEFAULT_COLORS = [
  "#4c1d95", // purple
  "#047857", // green
  "#1e40af", // blue
  "#b45309", // amber
  "#be123c", // rose
  "#0f766e", // teal
  "#4338ca", // indigo
  "#a21caf", // fuchsia
  "#b91c1c", // red
  "#1f2937", // gray
];

interface TagCreateFormProps {
  initialName?: string;
  initialColor?: string;
  onChange: (data: { name: string; color: string } | null) => void;
  showPreview?: boolean;
}

const TagCreateForm = ({ initialName = "", initialColor, onChange, showPreview = true }: TagCreateFormProps) => {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (initialColor) {
      setColor(initialColor);
    }
  }, [initialColor]);

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (newName.trim()) {
      onChange({ name: newName.trim(), color });
    } else {
      onChange(null);
    }
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (name.trim()) {
      onChange({ name: name.trim(), color: newColor });
    }
  };

  return (
    <div className="space-y-4">
      {/* Tag Name */}
      <div>
        <Label htmlFor="tag-name">Tag Name</Label>
        <Input id="tag-name" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Enter tag name" className="mt-1" autoFocus />
      </div>

      {/* Color Selector */}
      <div>
        <Label htmlFor="tag-color">Color</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {DEFAULT_COLORS.map((c) => (
            <div
              key={c}
              className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${color === c ? "ring-2 ring-primary scale-110" : "hover:scale-110"}`}
              style={{ backgroundColor: c }}
              onClick={() => handleColorChange(c)}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Input id="tag-color" type="color" value={color} onChange={(e) => handleColorChange(e.target.value)} className="w-8 h-8 p-0 border-none" />
          <span className="text-xs text-muted-foreground">Custom color</span>
        </div>
      </div>

      {/* Preview */}
      {showPreview && name.trim() && (
        <div className="p-2 border rounded-md bg-muted/50">
          <Label className="text-xs text-muted-foreground mb-1 block">Preview</Label>
          <Badge style={{ backgroundColor: color }} className="text-white">
            {name.trim()}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default TagCreateForm;
