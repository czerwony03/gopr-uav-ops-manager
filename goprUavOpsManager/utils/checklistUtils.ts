import { ChecklistSubItem } from '@/types/ProcedureChecklist';

/**
 * Recursively collects the ids of all sub-items (at any nesting depth)
 * contained within `subItems`.
 */
export function getAllSubItemIds(subItems: ChecklistSubItem[]): string[] {
  return subItems.flatMap(s => [s.id, ...(s.subItems ? getAllSubItemIds(s.subItems) : [])]);
}
