export interface Tag {
  id: string;
  name: string;
  color: string;
  is_system?: boolean; // System tags (favoris, partage, type) are hidden from normal lists
}

export interface Link {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: string[]; // Array of tag IDs
  tagObjects?: Tag[]; // Full tag objects from API
  createdAt: Date;
}
