import type { CatalogDeletion } from "@workspace/api-client-react";

export async function loadCatalogDeletions(): Promise<CatalogDeletion[]> {
  const response = await fetch("/api/catalog/deletions", { cache: "no-store" });
  if (!response.ok) throw new Error("Устгасан бичлэгийн мэдээллийг ачаалж чадсангүй.");
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every((item) =>
    item && typeof item.id === "string" &&
    (item.kind === "product" || item.kind === "portfolio"))) {
    throw new Error("Устгасан бичлэгийн мэдээлэл буруу байна.");
  }
  return data as CatalogDeletion[];
}

export function filterDeletedEntries<T>(
  items: readonly T[],
  deletions: readonly CatalogDeletion[],
  kind: CatalogDeletion["kind"],
  getId: (item: T) => string,
): T[] {
  const deletedIds = new Set(deletions.filter((item) => item.kind === kind).map((item) => item.id));
  return items.filter((item) => !deletedIds.has(getId(item)));
}
