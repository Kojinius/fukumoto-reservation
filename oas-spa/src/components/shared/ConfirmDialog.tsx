import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  okLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message,
  okLabel = 'OK',
  cancelLabel = 'キャンセル',
  variant = 'primary',
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-navy-500 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>{okLabel}</Button>
      </div>
    </Modal>
  );
}
