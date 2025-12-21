import { useState } from "react";
import { Link, Tag } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ExternalLink } from "lucide-react";
import TagBadge from "./TagBadge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAppLayout } from "@/hooks/useAppLayout";

interface LinksListProps {
  links: Link[];
  tags: Tag[];
  onLinkEdit: (link: Link) => void;
  onLinkDelete: (linkId: string) => void;
}

const LinksList = ({ links, tags, onLinkEdit, onLinkDelete }: LinksListProps) => {
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  const { handleTagSelect } = useAppLayout();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTagsForLink = (link: Link) => {
    return tags.filter((tag) => link.tags.includes(tag.id));
  };

  const confirmDelete = (id: string) => {
    setLinkToDelete(id);
  };

  const handleDelete = async () => {
    if (linkToDelete) {
      await onLinkDelete(linkToDelete);
      setLinkToDelete(null);
    }
  };

  const handleCancel = () => {
    setLinkToDelete(null);
  };

  return (
    <>
      {links.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {links.map((link) => (
            <Card
              key={link.id}
              className="group overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-muted/40 hover:border-primary/20 bg-card/80 backdrop-blur-sm"
            >
              <CardHeader className="p-4 pb-3 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base sm:text-lg font-semibold line-clamp-2 flex-1">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 group/link transition-colors">
                      <span className="group-hover/link:underline decoration-2">{link.title}</span>
                    </a>
                  </CardTitle>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onClick={() => onLinkEdit(link)}>
                      <Edit size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" onClick={() => confirmDelete(link.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                {link.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{link.description}</p>}
              </CardHeader>

              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {getTagsForLink(link).map((tag) => (
                    <TagBadge key={tag.id} tag={tag} size="sm" onClick={() => handleTagSelect(tag.id)} />
                  ))}
                  {getTagsForLink(link).length === 0 && <span className="text-xs text-muted-foreground italic">No tags</span>}
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-2 border-t border-muted/30">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-medium">Added:</span>
                  <time>{formatDate(link.createdAt)}</time>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4">
          <div className="max-w-sm mx-auto space-y-3">
            <div className="text-5xl opacity-20">🔗</div>
            <h3 className="text-lg font-semibold text-foreground">No links found</h3>
            <p className="text-sm text-muted-foreground">Add your first link using the button above to get started!</p>
          </div>
        </div>
      )}

      <AlertDialog open={!!linkToDelete} onOpenChange={(open) => !open && setLinkToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Link</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this link? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LinksList;
