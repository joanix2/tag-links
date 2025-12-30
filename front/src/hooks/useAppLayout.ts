import { createContext, useContext } from "react";
import { Tag } from "@/types";

export interface AppLayoutContextType {
  tags: Tag[];
  tagsLoading: boolean;
  hasMoreTags: boolean;
  totalTags: number;
  tagsScrollContainerRef: (node: HTMLDivElement | null) => void;
  selectedTags: string[];
  selectedTagsData: Tag[];
  currentView: "links" | "graph";
  showUntagged: boolean;
  tagMatchMode: "OR" | "AND";
  setCurrentView: (view: "links" | "graph") => void;
  setTagMatchMode: (mode: "OR" | "AND") => void;
  handleTagSelect: (tagId: string) => void;
  handleTagCreate: (tag: Omit<Tag, "id">) => Promise<Tag>;
  handleTagUpdate: (tag: Tag) => Promise<void>;
  handleTagDelete: (tagId: string) => Promise<void>;
  handleTagMerge: (sourceTagIds: string[], targetTag: { name: string; color: string }) => Promise<void>;
  toggleUntagged: () => void;
  reloadTags: () => void;
  registerTagsFromLinks: (linkTags: Tag[]) => void;
}

export const AppLayoutContext = createContext<AppLayoutContextType | null>(null);

export const useAppLayout = () => {
  const context = useContext(AppLayoutContext);
  if (!context) {
    throw new Error("useAppLayout must be used within AppLayout");
  }
  return context;
};
