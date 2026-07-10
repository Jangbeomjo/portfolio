/**
 * Undo / Redo 히스토리 관리 — 최소 50단계 스택
 */
const EditorHistory = (() => {
  const MAX_STEPS = 50;
  let undoStack = [];
  let redoStack = [];
  let paused = false;

  /** 현재 스토어 상태를 히스토리에 기록 */
  function push() {
    if (paused || !window.PortfolioStore) return;
    const snapshot = PortfolioStore.deepClone(PortfolioStore.get());
    undoStack.push(snapshot);
    if (undoStack.length > MAX_STEPS) undoStack.shift();
    redoStack = [];
    document.dispatchEvent(new CustomEvent("cms:history-changed"));
  }

  /** undo 실행 — 이전 상태 복원 */
  function undo() {
    if (undoStack.length < 2) return false;
    paused = true;
    redoStack.push(undoStack.pop());
    const prev = undoStack[undoStack.length - 1];
    PortfolioStore.loadFromSnapshot(prev);
    paused = false;
    document.dispatchEvent(new CustomEvent("cms:history-changed"));
    document.dispatchEvent(new CustomEvent("cms:data-changed", { detail: { source: "undo" } }));
    return true;
  }

  /** redo 실행 */
  function redo() {
    if (!redoStack.length) return false;
    paused = true;
    const next = redoStack.pop();
    undoStack.push(next);
    PortfolioStore.loadFromSnapshot(next);
    paused = false;
    document.dispatchEvent(new CustomEvent("cms:history-changed"));
    document.dispatchEvent(new CustomEvent("cms:data-changed", { detail: { source: "redo" } }));
    return true;
  }

  function reset(initialData) {
    undoStack = initialData ? [PortfolioStore.deepClone(initialData)] : [];
    redoStack = [];
    document.dispatchEvent(new CustomEvent("cms:history-changed"));
  }

  function canUndo() { return undoStack.length > 1; }
  function canRedo() { return redoStack.length > 0; }

  /** debounce 없이 즉시 기록이 필요할 때 pause/resume 사용 */
  function withPause(fn) {
    paused = true;
    try { fn(); } finally { paused = false; }
  }

  return { push, undo, redo, reset, canUndo, canRedo, withPause, MAX_STEPS };
})();

window.EditorHistory = EditorHistory;
