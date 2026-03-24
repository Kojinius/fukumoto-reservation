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
  pending:   { label: '未確認', cls: 'bg-amber-100 text-amber-700' },
  confirmed: { label: '確認済み', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'キャンセル', cls: 'bg-red-100 text-red-700' },
};

const KPI_ICONS = [
  /* 本日 */ <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  /* 今月 */ <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  /* 新規 */ <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>,
  /* 未確認 */ <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
];

type KpiFilter = 'today' | 'month' | 'new' | 'pending' | null;

export default function Dashboard() {
  const { reservations, loading } = useReservations();
  const kpis = useKpis(reservations);
  const { showToast } = useToast();

  // フィルター
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [zipSearch, setZipSearch] = useState('');
  const [createdAtFilter, setCreatedAtFilter] = useState('');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>(null);

  // 詳細モーダル
  const [selected, setSelected] = useState<ReservationRecord | null>(null);
  // 症状モーダル
  const [symptomsTarget, setSymptomsTarget] = useState<ReservationRecord | null>(null);

  // ステータス変更確認
  const [confirmAction, setConfirmAction] = useState<{ booking: ReservationRecord; status: ReservationStatus } | null>(null);
  const [updating, setUpdating] = useState(false);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const monthPrefix = todayStr.slice(0, 7);

  /** KPIカードクリック */
  function handleKpiClick(type: KpiFilter) {
    if (kpiFilter === type) {
      setKpiFilter(null);
      setStatusFilter('all');
      setDateFilter('');
    } else {
      setKpiFilter(type);
      if (type === 'today') { setStatusFilter('all'); setDateFilter(todayStr); }
      else if (type === 'month') { setStatusFilter('all'); setDateFilter(''); }
      else if (type === 'new') { setStatusFilter('all'); setDateFilter(''); }
      else if (type === 'pending') { setStatusFilter('pending'); setDateFilter(''); }
    }
    setSearch('');
    setPhoneSearch('');
    setZipSearch('');
    setCreatedAtFilter('');
  }

  /** フィルター適用 */
  const filtered = useMemo(() => {
    let list = reservations;

    // KPIフィルター（KPI計算と同じくキャンセル済みを除外）
    if (kpiFilter === 'today') {
      list = list.filter(r => r.date === todayStr && r.status !== 'cancelled');
    } else if (kpiFilter === 'month') {
      list = list.filter(r => r.date.startsWith(monthPrefix) && r.status !== 'cancelled');
    } else if (kpiFilter === 'new') {
      list = list.filter(r => r.visitType === '初診' && r.date.startsWith(monthPrefix) && r.status !== 'cancelled');
    } else if (kpiFilter === 'pending') {
      list = list.filter(r => r.status === 'pending');
    } else {
      // 通常フィルター
      if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
      if (dateFilter) list = list.filter(r => r.date === dateFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.furigana.toLowerCase().includes(q));
    }
    if (phoneSearch) {
      const q = phoneSearch.replace(/[-\s]/g, '');
      list = list.filter(r => r.phone.replace(/[-\s]/g, '').includes(q));
    }
    if (zipSearch) {
      const q = zipSearch.replace(/[-\s]/g, '');
      list = list.filter(r => (r.zip || '').replace(/[-\s]/g, '').includes(q));
    }
    if (createdAtFilter) {
      list = list.filter(r => r.createdAt && r.createdAt.startsWith(createdAtFilter));
    }
    return list;
  }, [reservations, statusFilter, dateFilter, search, phoneSearch, zipSearch, createdAtFilter, kpiFilter, todayStr, monthPrefix]);

  /** 通常フィルター操作時はKPIフィルターをクリア */
  function setStatusFilterAndClearKpi(s: ReservationStatus | 'all') {
    setKpiFilter(null);
    setStatusFilter(s);
  }

  function clearFilters() {
    setStatusFilter('all');
    setDateFilter('');
    setSearch('');
    setPhoneSearch('');
    setZipSearch('');
    setCreatedAtFilter('');
    setKpiFilter(null);
  }

  const hasFilter = dateFilter || createdAtFilter || search || phoneSearch || zipSearch || statusFilter !== 'all' || kpiFilter;

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
      {/* KPI カード — クリックでフィルター */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { key: 'today' as const, label: '本日の予約', value: kpis.todayCount, color: 'text-gold' },
          { key: 'month' as const, label: '今月の予約', value: kpis.monthCount, color: 'text-navy-700' },
          { key: 'new' as const, label: '新規患者', value: kpis.newPatients, color: 'text-sky-600' },
          { key: 'pending' as const, label: '未確認', value: kpis.pending, color: kpis.pending > 0 ? 'text-amber-600' : 'text-navy-400' },
        ]).map((kpi, i) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => handleKpiClick(kpi.key)}
            className={cn(
              'text-left rounded-xl border shadow-sm p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-px',
              kpiFilter === kpi.key ? 'border-gold bg-gold-50/50 ring-1 ring-gold/30' : 'border-cream-300/60 bg-white',
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn('text-navy-300', kpi.value > 0 && kpi.color)}>
                {KPI_ICONS[i]}
              </div>
              <div>
                <p className="text-[11px] text-navy-400 tracking-wider uppercase">{kpi.label}</p>
                <p className={cn('text-2xl font-mono font-bold', kpi.color)}>{kpi.value}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* フィルター + CSV */}
      <Card>
        <CardBody className="space-y-3">
          {/* 1段目: ステータスタブ */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(['all', 'pending', 'confirmed', 'cancelled'] as const).map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s && !kpiFilter ? 'primary' : 'ghost'}
                  onClick={() => setStatusFilterAndClearKpi(s)}
                >
                  {s === 'all' ? '全て' : STATUS_BADGE[s].label}
                </Button>
              ))}
            </div>
            <Button size="sm" variant="secondary" onClick={() => exportReservationsCsv(filtered)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              CSV出力
            </Button>
          </div>
          {/* 2段目: 検索フィールド */}
          <div className="grid grid-cols-5 gap-2">
            <Input
              label="氏名"
              placeholder="山田太郎"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Input
              label="郵便番号"
              placeholder="123-4567"
              value={zipSearch}
              onChange={e => setZipSearch(e.target.value)}
            />
            <Input
              label="電話番号"
              placeholder="090-1234-5678"
              value={phoneSearch}
              onChange={e => setPhoneSearch(e.target.value)}
            />
            <Input
              label="予約受付日"
              type="date"
              value={createdAtFilter}
              onChange={e => { setCreatedAtFilter(e.target.value); setKpiFilter(null); }}
            />
            <Input
              label="診察予定日"
              type="date"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setKpiFilter(null); }}
            />
          </div>
          {hasFilter && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              クリア
            </Button>
          )}
        </CardBody>
      </Card>

      {/* 予約テーブル */}
      <Card>
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                </svg>
              }
              title="予約がありません"
              className="py-8"
            />
          ) : (
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-cream-200">
                  {['診察予定日時', '氏名', '初/再', '症状', '電話', '予約受付日', 'ステータス', ''].map(h => (
                    <th key={h} className="px-3 py-3 text-[11px] font-medium text-navy-400 whitespace-nowrap tracking-wider uppercase text-left bg-cream-100/50 first:rounded-tl-lg last:rounded-tr-lg">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-cream-100 hover:bg-cream-100/60 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-navy-700 text-xs">
                      {formatDateTimeJa(r.date, r.time)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-navy-700 font-medium">{r.name}</div>
                      <div className="text-[11px] text-navy-400">{r.furigana}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Badge className={r.visitType === '初診' ? 'bg-sky-100 text-sky-700' : 'bg-cream-100 text-navy-500'}>
                        {r.visitType || '-'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 max-w-[160px]">
                      {r.symptoms ? (
                        <button
                          type="button"
                          onClick={() => setSymptomsTarget(r)}
                          className="text-left text-sky-600 hover:text-sky-800 hover:underline truncate block max-w-full transition-colors"
                          title={r.symptoms}
                        >
                          {r.symptoms}
                        </button>
                      ) : (
                        <span className="text-navy-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-navy-500 font-mono text-xs">{r.phone}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-navy-400 text-xs">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ja-JP') : '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Badge className={STATUS_BADGE[r.status].cls}>{STATUS_BADGE[r.status].label}</Badge>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        詳細
                      </Button>
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
              ['診察予定日時', formatDateTimeJa(selected.date, selected.time)],
              ['氏名', selected.name],
              ['ふりがな', selected.furigana],
              ['生年月日', selected.birthdate + (calcAge(selected.birthdate) !== null ? `（${calcAge(selected.birthdate)}歳）` : '')],
              ['郵便番号', selected.zip || '-'],
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
              ['予約受付日', selected.createdAt ? new Date(selected.createdAt).toLocaleString('ja-JP') : '-'],
            ].map(([label, val]) => (
              <div key={label} className="flex border-b border-cream-200/80 py-2">
                <dt className="w-24 shrink-0 text-navy-400">{label}</dt>
                <dd className="text-navy-700 whitespace-pre-wrap break-all">{val}</dd>
              </div>
            ))}
          </dl>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              閉じる
            </Button>
            {selected.status !== 'confirmed' && (
              <Button size="sm" onClick={() => setConfirmAction({ booking: selected, status: 'confirmed' })}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                確認済みにする
              </Button>
            )}
            {selected.status !== 'cancelled' && (
              <Button size="sm" variant="danger" onClick={() => setConfirmAction({ booking: selected, status: 'cancelled' })}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                キャンセル
              </Button>
            )}
          </div>
        </Modal>
      )}

      {/* 症状モーダル */}
      {symptomsTarget && (
        <Modal open={!!symptomsTarget} onClose={() => setSymptomsTarget(null)} title={`${symptomsTarget.name}様 — 症状`}>
          <p className="text-sm text-navy-700 whitespace-pre-wrap leading-relaxed">{symptomsTarget.symptoms}</p>
          {symptomsTarget.notes && (
            <div className="mt-4 pt-3 border-t border-cream-200">
              <p className="text-[11px] text-navy-400 mb-1">伝達事項</p>
              <p className="text-sm text-navy-600 whitespace-pre-wrap">{symptomsTarget.notes}</p>
            </div>
          )}
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
