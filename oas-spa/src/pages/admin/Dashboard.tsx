import { useState, useMemo } from 'react';
import { useReservations, useKpis, updateReservationStatus, exportReservationsCsv } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/useToast';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatDateTimeJa, calcAge } from '@/utils/date';
import { cn } from '@/utils/cn';
import type { ReservationRecord, ReservationStatus } from '@/types/reservation';

const STATUS_BADGE: Record<ReservationStatus, { label: string; cls: string }> = {
  pending:   { label: '未確認', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  confirmed: { label: '確認済み', cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  cancelled: { label: 'キャンセル', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

export default function Dashboard() {
  const { reservations, loading } = useReservations();
  const kpis = useKpis(reservations);
  const { showToast } = useToast();

  // フィルター
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');

  // 詳細モーダル
  const [selected, setSelected] = useState<ReservationRecord | null>(null);

  // ステータス変更確認
  const [confirmAction, setConfirmAction] = useState<{ booking: ReservationRecord; status: ReservationStatus } | null>(null);
  const [updating, setUpdating] = useState(false);

  /** フィルター適用 */
  const filtered = useMemo(() => {
    let list = reservations;
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    if (dateFilter) list = list.filter(r => r.date === dateFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.furigana.toLowerCase().includes(q));
    }
    return list;
  }, [reservations, statusFilter, dateFilter, search]);

  /** ステータス更新 */
  async function handleStatusUpdate() {
    if (!confirmAction) return;
    setUpdating(true);
    try {
      await updateReservationStatus(confirmAction.booking, confirmAction.status);
      showToast('ステータスを更新しました', 'success');
      setSelected(null);
    } catch {
      showToast('更新に失敗しました', 'error');
    } finally {
      setUpdating(false);
      setConfirmAction(null);
    }
  }

  if (loading) return <Spinner className="py-12" />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* KPI カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '本日の予約', value: kpis.todayCount, color: 'text-accent' },
          { label: '今月の予約', value: kpis.monthCount, color: 'text-lien-700 dark:text-lien-200' },
          { label: '新規患者（今月）', value: kpis.newPatients, color: 'text-sky-600 dark:text-sky-400' },
          { label: '未確認', value: kpis.pending, color: kpis.pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-lien-400' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardBody className="text-center py-4">
              <p className="text-xs text-lien-400 dark:text-lien-500 mb-1">{kpi.label}</p>
              <p className={cn('text-2xl font-mono font-bold', kpi.color)}>{kpi.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* フィルター + CSV */}
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <div className="flex gap-1">
            {(['all', 'pending', 'confirmed', 'cancelled'] as const).map(s => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'primary' : 'ghost'}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? '全て' : STATUS_BADGE[s].label}
              </Button>
            ))}
          </div>
          <Input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-40"
          />
          <Input
            placeholder="氏名検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-40"
          />
          {(dateFilter || search || statusFilter !== 'all') && (
            <Button size="sm" variant="ghost" onClick={() => { setStatusFilter('all'); setDateFilter(''); setSearch(''); }}>
              クリア
            </Button>
          )}
          <div className="flex-1" />
          <Button size="sm" variant="secondary" onClick={() => exportReservationsCsv(filtered)}>
            CSV出力
          </Button>
        </CardBody>
      </Card>

      {/* 予約テーブル */}
      <Card>
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState title="予約がありません" className="py-8" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-lien-200/80 dark:border-lien-600/60 text-left">
                  {['日時', '氏名', '初/再', '症状', '電話', 'ステータス', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold text-lien-400 dark:text-lien-500 whitespace-nowrap tracking-wider uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-lien-100/80 dark:border-lien-700/60 hover:bg-lien-50/80 dark:hover:bg-lien-700/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-lien-700 dark:text-lien-200">
                      {formatDateTimeJa(r.date, r.time)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-lien-900 dark:text-lien-100 font-medium">{r.name}</div>
                      <div className="text-xs text-lien-400 dark:text-lien-500">{r.furigana}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={r.visitType === '初診' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300' : 'bg-lien-100 dark:bg-lien-700 text-lien-600 dark:text-lien-300'}>
                        {r.visitType || '-'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-lien-600 dark:text-lien-300" title={r.symptoms}>
                      {r.symptoms}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-lien-600 dark:text-lien-300">{r.phone}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[r.status].cls}>{STATUS_BADGE[r.status].label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>詳細</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* 詳細モーダル */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="予約詳細" className="max-w-lg">
          <dl className="space-y-1 text-sm mb-6">
            {[
              ['予約番号', selected.id],
              ['予約日時', formatDateTimeJa(selected.date, selected.time)],
              ['氏名', selected.name],
              ['ふりがな', selected.furigana],
              ['生年月日', selected.birthdate + (calcAge(selected.birthdate) !== null ? `（${calcAge(selected.birthdate)}歳）` : '')],
              ['住所', selected.address],
              ['電話番号', selected.phone],
              ['メール', selected.email || '-'],
              ['性別', selected.gender || '未入力'],
              ['初診/再診', selected.visitType || '-'],
              ['保険証', selected.insurance || '-'],
              ['症状', selected.symptoms],
              ['伝達事項', selected.notes || 'なし'],
              ['連絡方法', selected.contactMethod || '-'],
              ['ステータス', STATUS_BADGE[selected.status].label],
              ['登録日時', selected.createdAt ? new Date(selected.createdAt).toLocaleString('ja-JP') : '-'],
            ].map(([label, val]) => (
              <div key={label} className="flex border-b border-lien-100 dark:border-lien-700 py-2">
                <dt className="w-24 shrink-0 text-lien-500 dark:text-lien-400">{label}</dt>
                <dd className="text-lien-900 dark:text-lien-100 whitespace-pre-wrap break-all">{val}</dd>
              </div>
            ))}
          </dl>
          <div className="flex gap-2 justify-end">
            {selected.phone && (
              <a href={`tel:${selected.phone}`}>
                <Button variant="ghost" size="sm">電話する</Button>
              </a>
            )}
            {selected.status !== 'confirmed' && (
              <Button size="sm" onClick={() => setConfirmAction({ booking: selected, status: 'confirmed' })}>
                確認済みにする
              </Button>
            )}
            {selected.status !== 'cancelled' && (
              <Button size="sm" variant="danger" onClick={() => setConfirmAction({ booking: selected, status: 'cancelled' })}>
                キャンセル
              </Button>
            )}
          </div>
        </Modal>
      )}

      {/* ステータス変更確認 */}
      <ConfirmDialog
        open={!!confirmAction}
        title="ステータス変更"
        message={confirmAction?.status === 'cancelled'
          ? `${confirmAction.booking.name}様の予約をキャンセルしますか？`
          : `${confirmAction?.booking.name}様の予約を確認済みにしますか？`}
        okLabel={confirmAction?.status === 'cancelled' ? 'キャンセルする' : '確認済みにする'}
        variant={confirmAction?.status === 'cancelled' ? 'danger' : 'primary'}
        onConfirm={handleStatusUpdate}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
