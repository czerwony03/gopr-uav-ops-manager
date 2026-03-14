import { getAllSubItemIds, propagateSubItemDoneState } from '../checklistUtils';
import { ChecklistSubItem } from '@/types/ProcedureChecklist';

// ── helpers ──────────────────────────────────────────────────────────────────

function leaf(id: string): ChecklistSubItem {
  return { id, topic: id };
}

function node(id: string, ...children: ChecklistSubItem[]): ChecklistSubItem {
  return { id, topic: id, subItems: children };
}

// ── getAllSubItemIds ──────────────────────────────────────────────────────────

describe('getAllSubItemIds', () => {
  it('returns empty array for empty input', () => {
    expect(getAllSubItemIds([])).toEqual([]);
  });

  it('returns ids of flat leaf items', () => {
    expect(getAllSubItemIds([leaf('a'), leaf('b')])).toEqual(['a', 'b']);
  });

  it('returns ids of nested items in depth-first order', () => {
    const tree = [node('b', leaf('b1'), leaf('b2')), leaf('c')];
    expect(getAllSubItemIds(tree)).toEqual(['b', 'b1', 'b2', 'c']);
  });
});

// ── propagateSubItemDoneState ─────────────────────────────────────────────────

describe('propagateSubItemDoneState', () => {
  it('does not mutate the set for a flat list of leaf items', () => {
    const items = [leaf('a'), leaf('b')];
    const completed = new Set(['a']);
    propagateSubItemDoneState(items, completed);
    expect([...completed]).toEqual(['a']);
  });

  it('marks intermediate node when all its children are done', () => {
    // tree: B -> B1, B2
    const items = [node('b', leaf('b1'), leaf('b2'))];
    const completed = new Set(['b1', 'b2']);
    propagateSubItemDoneState(items, completed);
    expect(completed.has('b')).toBe(true);
  });

  it('does not mark intermediate node when only some children are done', () => {
    const items = [node('b', leaf('b1'), leaf('b2'))];
    const completed = new Set(['b1']);
    propagateSubItemDoneState(items, completed);
    expect(completed.has('b')).toBe(false);
  });

  it('removes intermediate node from set when a child is un-marked', () => {
    // b was previously auto-added; now b2 is un-marked
    const items = [node('b', leaf('b1'), leaf('b2'))];
    const completed = new Set(['b', 'b1']); // b2 un-marked, b still in set
    propagateSubItemDoneState(items, completed);
    expect(completed.has('b')).toBe(false);
  });

  it('handles deeply nested trees correctly', () => {
    // tree: A -> A1 -> A1a, A1b
    const items = [node('a', node('a1', leaf('a1a'), leaf('a1b')))];

    // mark only the leaves
    const completed = new Set(['a1a', 'a1b']);
    propagateSubItemDoneState(items, completed);
    expect(completed.has('a1')).toBe(true);
    expect(completed.has('a')).toBe(true);
  });

  it('parent item is marked done only when ALL branches are done', () => {
    // tree: A (leaf), B -> B1, B2
    const items = [leaf('a'), node('b', leaf('b1'), leaf('b2'))];

    // only B's children are done; 'a' is not done yet
    const completed = new Set(['b1', 'b2']);
    propagateSubItemDoneState(items, completed);
    // B should be auto-marked because all its children are done
    expect(completed.has('b')).toBe(true);
    // A is still not done, so the top-level allDone check would still fail
    expect(completed.has('a')).toBe(false);
  });

  it('returns the mutated set', () => {
    const items = [node('b', leaf('b1'), leaf('b2'))];
    const completed = new Set(['b1', 'b2']);
    const result = propagateSubItemDoneState(items, completed);
    expect(result).toBe(completed);
  });
});
