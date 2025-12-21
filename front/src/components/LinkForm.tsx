import { useEffect, useState } from "react";
import { Link, Tag } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TagSelector from "@/components/TagSelector";

interface LinkFormProps {
  isOpen: boolean;
  link: Link | null;
  tags: Tag[];
  onSubmit: (link: Omit<Link, "id" | "createdAt">) => void;
  onCancel: () => void;
}

const LinkForm = ({ isOpen, link, tags, onSubmit, onCancel }: LinkFormProps) => {
  const [title, setTitle] = useState(link?.title || "");
  const [url, setUrl] = useState(link?.url || "");
  const [description, setDescription] = useState(link?.description || "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(link?.tags || []);

  useEffect(() => {
    if (link) {
      setTitle(link.title);
      setUrl(link.url);
      setDescription(link.description || "");
      setSelectedTagIds(link.tags);
    } else {
      setTitle("");
      setUrl("");
      setDescription("");
      setSelectedTagIds([]);
    }
  }, [link, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !url.trim()) return;

    onSubmit({
      title: title.trim(),
      url: url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`,
      description: description.trim(), // Send empty string instead of undefined to allow clearing
      tags: selectedTagIds,
    });
  };

  const handleTagsChange = (tagIds: string[]) => {
    setSelectedTagIds(tagIds);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{link ? "Edit Link" : "Add New Link"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Link title" className="col-span-3" required autoFocus />
            </div>

            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="url" className="text-right">
                URL
              </Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="col-span-3" required />
            </div>

            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" className="col-span-3" rows={2} />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <Label className="text-right pt-2">Tags</Label>
              <div className="col-span-3">
                <TagSelector tags={tags} selectedTagIds={selectedTagIds} onTagsChange={handleTagsChange} placeholder="Search and select tags..." />
                {tags.length === 0 && <p className="text-sm text-muted-foreground mt-2">No tags available. Create some tags first!</p>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !url.trim()}>
              {link ? "Update" : "Add"} Link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LinkForm;
