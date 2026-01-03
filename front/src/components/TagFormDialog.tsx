import { Tag } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TagForm from "@/components/TagForm";

interface TagFormDialogProps {
  isOpen: boolean;
  tag: Tag | null;
  onSubmit: (tag: Omit<Tag, "id">) => void;
  onCancel: () => void;
  title?: string;
}

const TagFormDialog = ({ isOpen, tag, onSubmit, onCancel, title }: TagFormDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title || (tag ? "Edit Tag" : "Create New Tag")}</DialogTitle>
        </DialogHeader>
        <TagForm tag={tag} onSubmit={onSubmit} onCancel={onCancel} />
      </DialogContent>
    </Dialog>
  );
};

export default TagFormDialog;
