import { useEffect, useState } from "react";
import { Link, Tag } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TagSelector from "@/components/TagSelector";

const DOCUMENT_TYPES = ["Page", "Image", "Vidéo", "Son", "Texte", "PDF", "Présentation", "3D", "Formulaire", "Carte", "Tableau", "Graphique", "Animation", "Jeu", "Quiz", "Simulation", "Autre"];

interface LinkFormProps {
  isOpen: boolean;
  link: Link | null;
  tags: Tag[];
  onSubmit: (link: Omit<Link, "id" | "createdAt">) => void;
  onTagCreate: (tag: Omit<Tag, "id">) => Promise<Tag>;
  onCancel: () => void;
  reloadTags?: () => Promise<void>;
}

const LinkForm = ({ isOpen, link, tags, onSubmit, onTagCreate, onCancel, reloadTags }: LinkFormProps) => {
  const [title, setTitle] = useState(link?.title || "");
  const [url, setUrl] = useState(link?.url || "");
  const [description, setDescription] = useState(link?.description || "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(link?.tags || []);

  // Extract current document type from selected tags
  const getCurrentDocumentType = (): string | undefined => {
    const documentTypeTags = tags.filter((tag) => DOCUMENT_TYPES.includes(tag.name) && selectedTagIds.includes(tag.id));
    return documentTypeTags.length > 0 ? documentTypeTags[0].name : undefined;
  };

  const [documentType, setDocumentType] = useState<string | undefined>(getCurrentDocumentType());

  useEffect(() => {
    if (link) {
      setTitle(link.title);
      setUrl(link.url);
      setDescription(link.description || "");
      setSelectedTagIds(link.tags);
      // Extract document type from link's tags
      const docType = tags.find((tag) => DOCUMENT_TYPES.includes(tag.name) && link.tags.includes(tag.id));
      setDocumentType(docType?.name);
    } else {
      setTitle("");
      setUrl("");
      setDescription("");
      setSelectedTagIds([]);
      setDocumentType(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link, isOpen]);

  // Handle document type selection - automatically manage tags
  const handleDocumentTypeChange = async (value: string) => {
    // Remove all existing document type tags
    const nonDocTypeTags = selectedTagIds.filter((tagId) => {
      const tag = tags.find((t) => t.id === tagId);
      return tag && !DOCUMENT_TYPES.includes(tag.name);
    });

    if (value === "none") {
      // No document type selected - remove all document type tags immediately
      setDocumentType(undefined);
      setSelectedTagIds(nonDocTypeTags);
    } else {
      // Find the tag corresponding to the selected document type
      let docTypeTag = tags.find((tag) => tag.name === value);

      // If the tag doesn't exist, create it synchronously
      if (!docTypeTag) {
        try {
          const createdTag = await onTagCreate({
            name: value,
            color: "#92400E", // Brown color for document types
          });
          // Use the newly created tag immediately
          docTypeTag = createdTag;
        } catch (error) {
          console.error("Failed to create document type tag:", error);
          return;
        }
      }

      // Replace immediately with the tag (existing or just created)
      setDocumentType(value);
      setSelectedTagIds([...nonDocTypeTags, docTypeTag.id]);
    }
  };

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

    // Update document type based on selected tags
    const docTypeTag = tags.find((tag) => DOCUMENT_TYPES.includes(tag.name) && tagIds.includes(tag.id));
    setDocumentType(docTypeTag?.name);
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

            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="document-type" className="text-right">
                Type
              </Label>
              <Select value={documentType || "none"} onValueChange={handleDocumentTypeChange}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select document type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
