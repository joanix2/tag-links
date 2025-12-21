import { Tag, Link } from "@/types";

export interface GraphViewProps {
  links: Link[];
  tags: Tag[];
  selectedTags: string[];
}

export interface SelectedNodeData {
  type: "tag" | "link";
  data: Tag | Link;
}

export interface GraphStats {
  linksCount: number;
  tagsCount: number;
  relationsCount: number;
}

export interface D3Node {
  id: string;
  type: "tag" | "link";
  data: Tag | Link;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface D3Link {
  source: string | D3Node;
  target: string | D3Node;
  isSelected: boolean;
}
