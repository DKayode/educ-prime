import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAcronym(name: string): string {
  if (!name) return "";

  // Check for existing acronym in parentheses, e.g. "Name (ACRONYM)"
  const match = name.match(/\(([A-Z0-9]+)\)/);
  if (match) {
    return match[1];
  }

  const stopWords = ["de", "des", "du", "la", "le", "les", "et", "en", "au", "aux", "pour", "sur", "d'", "l'"];
  return name
    .split(/[\s-]+/) // Split by spaces or hyphens
    .filter(word => word.length > 0)
    .filter(word => !stopWords.includes(word.toLowerCase()))
    .map(word => {
      // Handle cases like "L'Université" -> "U" or "d'Abomey" -> "A" if strictly needed, 
      // but typically split separates them or we keep the main letter. 
      // If the word starts with l' or d', strip it.
      const cleanWord = word.replace(/^[ldLD]['’]/, '');
      return cleanWord.charAt(0).toUpperCase();
    })
    .join("");
}
