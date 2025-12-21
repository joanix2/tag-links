import { Tag, Link } from "@/types";
import { D3Node } from "../types";

export const getNodeColor = (node: D3Node): string => {
  if (node.type === "tag") {
    return (node.data as Tag).color;
  }
  return "#3b82f6"; // Blue for links
};

export const getNodeRadius = (node: D3Node): number => {
  return 48; // 96px diameter = 48px radius (Neo4j Bloom style)
};

export const getNodeLabel = (node: D3Node): string => {
  if (node.type === "tag") {
    return (node.data as Tag).name;
  }
  const link = node.data as Link;
  return link.title.length > 15 ? link.title.substring(0, 15) + "..." : link.title;
};

export const isTagNode = (nodeId: string): boolean => {
  return nodeId.startsWith("tag-");
};

export const isLinkNode = (nodeId: string): boolean => {
  return nodeId.startsWith("link-");
};
