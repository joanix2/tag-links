import { useState } from "react";
import { Tag } from "@/types";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TagBadge from "./TagBadge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface TagsListProps {
  tags: Tag[];
  selectedTags: string[];
  onTagSelect: (tagId: string) => void;
  onTagEdit: (tag: Tag) => void;
  onTagDelete: (tagId: string) => void;
}

const TagsList = ({ tags, selectedTags, onTagSelect, onTagEdit, onTagDelete }: TagsListProps) => {
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  const confirmDelete = (id: string) => {
    setTagToDelete(id);
  };

  const handleDelete = async () => {
    if (tagToDelete) {
      await onTagDelete(tagToDelete);
      setTagToDelete(null);
    }
  };

  const handleCancel = () => {
    setTagToDelete(null);
  };

  return (
    <div>
      {tags.length > 0 ? (
        tags.map((tag) => (
          <div
            key={tag.id}
            className={`flex items-center justify-between p-1 rounded-md transition-colors ${
              selectedTags.includes(tag.id) ? "bg-primary-foreground/20 shadow-sm border border-primary-foreground/30" : "hover:bg-primary-foreground/10"
            }`}
          >
            <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => onTagSelect(tag.id)}>
              <TagBadge tag={tag} isSelected={selectedTags.includes(tag.id)} size="sm" showIcon />
            </div>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-50 hover:opacity-100 text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagEdit(tag);
                }}
              >
                <Edit size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-50 hover:opacity-100 text-primary-foreground hover:text-destructive hover:bg-primary-foreground/20"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete(tag.id);
                }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4">No tags yet. Create one!</div>
      )}

      <AlertDialog open={!!tagToDelete} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the tag and remove it from all associated links.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TagsList;
