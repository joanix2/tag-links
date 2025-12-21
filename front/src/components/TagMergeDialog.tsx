import { useState } from "react";
import { Tag } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TagSelector from "@/components/TagSelector";
import TagCreateForm from "@/components/TagCreateForm";

interface TagMergeDialogProps {
  isOpen: boolean;
  tags: Tag[];
  onMerge: (sourceTagIds: string[], targetTag: { name: string; color: string }) => Promise<void>;
  onCancel: () => void;
}

const TagMergeDialog = ({ isOpen, tags, onMerge, onCancel }: TagMergeDialogProps) => {
  const [sourceTags, setSourceTags] = useState<string[]>([]);
  const [targetTag, setTargetTag] = useState<{ name: string; color: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (sourceTags.length === 0) {
      setError("Please select at least one source tag");
      return;
    }

    if (!targetTag) {
      setError("Please create a target tag");
      return;
    }

    if (!targetTag.name.trim()) {
      setError("Please enter a name for the target tag");
      return;
    }

    setIsLoading(true);
    try {
      await onMerge(sourceTags, { name: targetTag.name, color: targetTag.color });
      // Reset form
      setSourceTags([]);
      setTargetTag(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge tags");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSourceTags([]);
    setTargetTag(null);
    setError(null);
    onCancel();
  };

  // Get tags objects for display
  const sourceTagsData = tags.filter((tag) => sourceTags.includes(tag.id));
  const targetTagData = targetTag ? { id: "new", name: targetTag.name, color: targetTag.color } : null;

  // Filter tags for source selector
  const availableSourceTags = tags;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Merge Tags</DialogTitle>
          <DialogDescription>Merge multiple tags into one. All links with source tags will be updated to use the target tag. Source tags will be deleted after merging.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source Tags */}
          <div className="space-y-2">
            <Label>Source Tags (to be merged and deleted)</Label>
            <TagSelector tags={availableSourceTags} selectedTagIds={sourceTags} onTagsChange={setSourceTags} placeholder="Select tags to merge..." />
            {sourceTags.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {sourceTags.length} tag{sourceTags.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Visual Arrow */}
          {sourceTags.length > 0 && targetTag && (
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-4 px-6 py-3 bg-muted rounded-lg">
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {sourceTagsData.slice(0, 3).map((tag) => (
                    <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                  {sourceTagsData.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{sourceTagsData.length - 3} more
                    </Badge>
                  )}
                </div>

                <ArrowRight className="flex-shrink-0" size={24} />

                {targetTagData && (
                  <Badge style={{ backgroundColor: targetTagData.color }} className="text-white">
                    {targetTagData.name}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Target Tag */}
          <div className="space-y-2">
            <Label>Target Tag (create new tag for merge)</Label>
            <TagCreateForm onChange={setTargetTag} showPreview={true} />
          </div>

          {/* Warning Alert */}
          {sourceTags.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This action cannot be undone. {sourceTags.length} source tag
                {sourceTags.length > 1 ? "s" : ""} will be permanently deleted after merging.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading || sourceTags.length === 0 || !targetTag}>
            {isLoading ? "Merging..." : "Merge Tags"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TagMergeDialog;
