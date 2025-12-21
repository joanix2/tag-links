import { Button } from "@/components/ui/button";
import { X, ExternalLink, Tag as TagIcon } from "lucide-react";
import { Tag, Link } from "@/types";
import { SelectedNodeData } from "./types";

interface NodeDetailsProps {
  selectedNode: SelectedNodeData;
  links: Link[];
  tags: Tag[];
  onClose: () => void;
}

const TagDetails = ({ tag, links }: { tag: Tag; links: Link[] }) => {
  const linkCount = links.filter((l) => l.tags.includes(tag.id)).length;

  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs text-muted-foreground mb-1">Name</div>
        <div
          className="inline-block px-3 py-1 rounded-full text-sm font-medium"
          style={{
            backgroundColor: tag.color,
            color: "white",
          }}
        >
          {tag.name}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">Color</div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border shadow-sm" style={{ backgroundColor: tag.color }}></div>
          <span className="text-sm font-mono">{tag.color}</span>
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">Links with this tag</div>
        <div className="text-sm font-medium">{linkCount} links</div>
      </div>
    </div>
  );
};

const LinkDetails = ({ link, tags }: { link: Link; tags: Tag[] }) => {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs text-muted-foreground mb-1">Title</div>
        <div className="text-sm font-medium">{link.title}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">URL</div>
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline break-all flex items-center gap-1">
          {link.url}
          <ExternalLink size={12} />
        </a>
      </div>
      {link.description && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Description</div>
          <div className="text-sm">{link.description}</div>
        </div>
      )}
      <div>
        <div className="text-xs text-muted-foreground mb-1">Tags</div>
        <div className="flex flex-wrap gap-1">
          {link.tags.length > 0 ? (
            link.tags.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              return tag ? (
                <span
                  key={tag.id}
                  className="inline-block px-2 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: tag.color,
                    color: "white",
                  }}
                >
                  {tag.name}
                </span>
              ) : null;
            })
          ) : (
            <span className="text-sm text-muted-foreground">No tags</span>
          )}
        </div>
      </div>
    </div>
  );
};

export const NodeDetails = ({ selectedNode, links, tags, onClose }: NodeDetailsProps) => {
  return (
    <>
      <div className="border-t pt-3 mb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {selectedNode.type === "tag" ? <TagIcon size={18} className="text-muted-foreground" /> : <ExternalLink size={18} className="text-blue-500" />}
            <h3 className="font-semibold text-sm">{selectedNode.type === "tag" ? "Tag Details" : "Link Details"}</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>
      </div>

      {selectedNode.type === "tag" ? <TagDetails tag={selectedNode.data as Tag} links={links} /> : <LinkDetails link={selectedNode.data as Link} tags={tags} />}
    </>
  );
};
