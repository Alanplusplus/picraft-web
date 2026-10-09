import "server-only";

import data from "@/data/categories.json";

import type { CategoryId } from "./site";

export interface CategoryPage {
  updated: string;
  seo: { title: string; description: string; h1: string };
  intro: string[];
  sections: { heading: string; paragraphs?: string[]; items?: string[] }[];
  faq: { q: string; a: string }[];
}

export function getCategoryPage(id: CategoryId): CategoryPage {
  return (data as Record<CategoryId, CategoryPage>)[id];
}
