export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Link {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: string[]; // Array of tag IDs
  createdAt: Date;
}
