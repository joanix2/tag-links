import { useState, useEffect } from "react";
import { Tag } from "@/types";
import { Button } from "@/components/ui/button";
import TagCreateForm from "@/components/TagCreateForm";

interface TagFormProps {
  tag: Tag | null;
  onSubmit: (tag: Omit<Tag, "id">) => void;
  onCancel: () => void;
}

const TagForm = ({ tag, onSubmit, onCancel }: TagFormProps) => {
  const [tagData, setTagData] = useState<{ name: string; color: string } | null>(tag ? { name: tag.name, color: tag.color } : null);

  useEffect(() => {
    if (tag) {
      setTagData({ name: tag.name, color: tag.color });
    } else {
      setTagData(null);
    }
  }, [tag]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagData || !tagData.name.trim()) return;

    onSubmit({
      name: tagData.name.trim(),
      color: tagData.color,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TagCreateForm initialName={tag?.name || ""} initialColor={tag?.color} onChange={setTagData} showPreview={false} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!tagData || !tagData.name.trim()}>
          {tag ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};

export default TagForm;
