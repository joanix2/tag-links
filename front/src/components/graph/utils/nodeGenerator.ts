import { Tag, Link } from "@/types";
import { D3Node, D3Link } from "../types";

export const generateGraphData = (links: Link[], tags: Tag[], selectedTags: string[]): { nodes: D3Node[]; links: D3Link[] } => {
  const nodes: D3Node[] = [];
  const graphLinks: D3Link[] = [];

  // Create a set of valid tag IDs for quick lookup
  const validTagIds = new Set(tags.map((tag) => tag.id));

  // Create tag nodes
  tags.forEach((tag) => {
    nodes.push({
      id: `tag-${tag.id}`,
      type: "tag",
      data: tag,
    });
  });

  // Create link nodes
  links.forEach((link) => {
    nodes.push({
      id: `link-${link.id}`,
      type: "link",
      data: link,
    });

    // Create edges between links and their tags (only for valid tags)
    link.tags.forEach((tagId) => {
      // Only create edge if the tag exists
      if (validTagIds.has(tagId)) {
        const isSelected = selectedTags.includes(tagId);
        graphLinks.push({
          source: `link-${link.id}`,
          target: `tag-${tagId}`,
          isSelected,
        });
      }
    });
  });

  return { nodes, links: graphLinks };
};
