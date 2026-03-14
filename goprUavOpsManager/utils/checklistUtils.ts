import { ChecklistSubItem } from '@/types/ProcedureChecklist';

/**
 * Recursively collects the ids of all sub-items (at any nesting depth)
 * contained within `subItems`.
 */
export function getAllSubItemIds(subItems: ChecklistSubItem[]): string[] {
  return subItems.flatMap(s => [s.id, ...(s.subItems ? getAllSubItemIds(s.subItems) : [])]);
}

/**
 * Propagates "done" state upward through a sub-item tree.
 * For each intermediate sub-item (one that has children):
 *   - If ALL of its descendants are in `completedIds`, the sub-item itself is added.
 *   - Otherwise it is removed (in case it was previously auto-added).
 * This ensures intermediate nodes accurately reflect whether all their children
 * are done even when leaf nodes are toggled individually.
 * Mutates `completedIds` in-place and returns it.
 */
export function propagateSubItemDoneState(
  subItems: ChecklistSubItem[],
  completedIds: Set<string>,
): Set<string> {
  for (const subItem of subItems) {
    if (subItem.subItems && subItem.subItems.length > 0) {
      propagateSubItemDoneState(subItem.subItems, completedIds);
      const allDescendantIds = getAllSubItemIds(subItem.subItems);
      if (allDescendantIds.length > 0 && allDescendantIds.every(id => completedIds.has(id))) {
        completedIds.add(subItem.id);
      } else {
        completedIds.delete(subItem.id);
      }
    }
  }
  return completedIds;
}
