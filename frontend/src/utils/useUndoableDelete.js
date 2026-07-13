import { useToast } from '../context/ToastContext';

// Deferred delete with an Undo affordance: the item is removed from the UI
// immediately, but the server delete only fires after the grace period unless
// the user hits Undo (which restores the item locally).
//
// Usage:
//   const undoableDelete = useUndoableDelete();
//   undoableDelete({
//     label: 'Transaction',
//     remove: () => setItems((x) => x.filter((i) => i.id !== item.id)),
//     restore: () => setItems((x) => [...x, item]),  // or reload
//     doDelete: () => client.delete(`/transactions/${item.id}/`),
//   });
export function useUndoableDelete() {
  const toast = useToast();
  const GRACE = 5000;

  return function undoableDelete({ label = 'Item', remove, restore, doDelete }) {
    remove();
    let undone = false;
    const timer = setTimeout(() => {
      if (!undone) {
        Promise.resolve(doDelete()).catch(() => restore());
      }
    }, GRACE);

    toast(`${label} deleted.`, 'info', GRACE, {
      label: 'Undo',
      onClick: () => {
        undone = true;
        clearTimeout(timer);
        restore();
      },
    });
  };
}
