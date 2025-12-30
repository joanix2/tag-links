/**
 * Service for managing special tags (Favoris, Partage, etc.)
 */

import { Tag, Link } from "@/types";

export interface ToggleTagOptions {
  linkId: string;
  link: Link;
  tags: Tag[];
  tagName: string;
  tagColor: string;
  fetchApi: (url: string, options?: Record<string, unknown>) => Promise<unknown>;
  userId?: string;
}

export interface ToggleTagResult {
  updatedTags: string[];
  updatedTagObjects: Tag[];
  createdTag?: Tag;
  needsTagReload: boolean;
}

/**
 * Toggle a special tag (add if not present, remove if present)
 * Creates the tag if it doesn't exist
 */
export async function toggleSpecialTag(options: ToggleTagOptions): Promise<ToggleTagResult> {
  const { linkId, link, tags, tagName, tagColor, fetchApi, userId } = options;

  // Find or create the special tag
  let specialTag = tags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
  let createdTag: Tag | undefined;
  let needsTagReload = false;

  if (!specialTag) {
    // Create the tag if it doesn't exist
    const newTag = (await fetchApi("/tags/", {
      method: "POST",
      body: JSON.stringify({
        name: tagName,
        color: tagColor,
        user_id: userId,
        is_system: true, // Mark special tags as system tags
      }),
    })) as Tag;
    specialTag = newTag;
    createdTag = newTag;
    needsTagReload = true;
  }

  // Toggle the tag: add or remove
  const hasTag = link.tags.includes(specialTag.id);
  const updatedTags = hasTag ? link.tags.filter((tagId) => tagId !== specialTag.id) : [...link.tags, specialTag.id];

  // Update the link with new tags
  const updatedLink = (await fetchApi(`/urls/${linkId}`, {
    method: "PUT",
    body: JSON.stringify({
      url: link.url,
      title: link.title,
      description: link.description,
      tag_ids: updatedTags,
    }),
  })) as { tags: Tag[] };

  return {
    updatedTags,
    updatedTagObjects: updatedLink.tags || [],
    createdTag,
    needsTagReload,
  };
}

/**
 * Check if a link has a specific special tag
 */
export function hasSpecialTag(link: Link, tags: Tag[], tagName: string): boolean {
  const specialTag = tags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
  return specialTag ? link.tags.includes(specialTag.id) : false;
}
