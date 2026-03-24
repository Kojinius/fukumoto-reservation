import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  okLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message,
  okLabel,
  cancelLabel,
  variant = 'primary',
  loading,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');
  const resolvedOkLabel = okLabel ?? t('ok');
  const resolvedCancelLabel = cancelLabel ?? t('cancel');

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-navy-500 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>{resolvedCancelLabel}</Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{resolvedOkLabel}</Button>
      </div>
    </Modal>
  );
}
