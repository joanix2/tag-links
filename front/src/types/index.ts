export interface Tag {
  id: string;
  name: string;
  color: string;
}

export type DocumentType =
  | "Page"
  | "Image"
  | "Vidéo"
  | "Son"
  | "Texte"
  | "PDF"
  | "Présentation"
  | "3D"
  | "Formulaire"
  | "Carte"
  | "Tableau"
  | "Graphique"
  | "Animation"
  | "Jeu"
  | "Quiz"
  | "Simulation"
  | "Autre";

export interface Link {
  id: string;
  title: string;
  url: string;
  description?: string;
  document_type?: DocumentType;
  tags: string[]; // Array of tag IDs
  createdAt: Date;
}
