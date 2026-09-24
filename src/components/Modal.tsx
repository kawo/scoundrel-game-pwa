import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  id: string;
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  /** Clicking the dimmed backdrop closes it. Off for the welcome primer. */
  closeOnBackdrop?: boolean;
  /** Extra data-* for styling (the end screen's won/lost). */
  result?: string;
  children: ReactNode;
}

/**
 * A native <dialog>, opened with showModal() so the browser supplies Esc,
 * the focus trap and the inert page behind it. `open` is the source of truth;
 * the dialog's own close event (Esc, or a <form method="dialog"> button)
 * reports back through onClose so the two never drift apart.
 */
export function Modal({
  id, open, onClose, labelledBy, className = 'modal', closeOnBackdrop = true, result, children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const wanted = useRef(open);
  wanted.current = open;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      id={id}
      className={className}
      aria-labelledby={labelledBy}
      data-result={result}
      // The close event also fires when we close it ourselves (open went
      // false, perhaps because another dialog is taking over). Only report
      // closes the player made, or they would cancel that hand-over.
      onClose={() => { if (wanted.current) onClose(); }}
      // <dialog> does not close on a backdrop click by itself. A click on the
      // backdrop lands on the dialog element itself, never on its content.
      onClick={(event) => {
        if (closeOnBackdrop && event.target === ref.current) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

/** The × in the corner. A dialog form, so it closes natively. */
export function CloseButton({ label }: { label: string }) {
  return (
    <form method="dialog" className="modal__close-form">
      <button className="modal__close" value="close" aria-label={label}>&times;</button>
    </form>
  );
}
