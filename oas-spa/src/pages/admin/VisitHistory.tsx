import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useVisitHistories, exportVisitHistoriesCsv } from '@/hooks/useAdmin';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SortableHeader, toggleSortKey, multiSort, type SortKey } from '@/components/shared/SortableHeader';
import { formatDateTimeJa, calcAge } from '@/utils/date';
import type { VisitHistoryRecord } from '@/types/reservation';

/** ソート用値取得 */
function getValue(r: VisitHistoryRecord, col: string): string | number {
  switch (col) {
    case 'datetime':   return `${r.date} ${r.time}`;
    case 'name':       return r.furigana || r.name;
    case 'visitType':  return r.visitType || '';
    case 'phone':      return r.phone;
    default:           return '';
  }
}

export default function VisitHistory() {
  const { t } = useTranslation('admin');
  const { histories, loading } = useVisitHistories();

  // 検索
  const [search, setSearch] = useState('');
  const [zipSearch, setZipSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [visitDateFrom, setVisitDateFrom] = useState('');
  const [visitDateTo, setVisitDateTo] = useState('');

  // ソート
  const [sortKeys, setSortKeys] = useState<SortKey[]>([{ col: 'datetime', dir: 'desc' }]);
  function handleSort(key: string) { setSortKeys(prev => toggleSortKey(prev, key)); }

  // 詳細モーダル
  const [selected, setSelected] = useState<VisitHistoryRecord | null>(null);

  /** フィルター */
  const filtered = useMemo(() => {
    let list = histories;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.furigana.toLowerCase().includes(q));
    }
    if (zipSearch) {
      const q = zipSearch.replace(/[-\s]/g, '');
      list = list.filter(r => (r.zip || '').replace(/[-\s]/g, '').includes(q));
    }
    if (phoneSearch) {
      const q = phoneSearch.replace(/[-\s]/g, '');
      list = list.filter(r => r.phone.replace(/[-\s]/g, '').includes(q));
    }
    if (visitDateFrom) {
      list = list.filter(r => r.date >= visitDateFrom);
    }
    if (visitDateTo) {
      list = list.filter(r => r.date <= visitDateTo);
    }
    return list;
  }, [histories, search, zipSearch, phoneSearch, visitDateFrom, visitDateTo]);

  const sorted = useMemo(() => multiSort(filtered, sortKeys, getValue), [filtered, sortKeys]);

  const hasFilter = search || zipSearch || phoneSearch || visitDateFrom || visitDateTo;

  function clearFilters() {
    setSearch('');
    setZipSearch('');
    setPhoneSearch('');
    setVisitDateFrom('');
    setVisitDateTo('');
  }

  /** CSV出力ラベル構築 */
  const csvLabels = {
    headers: [
      t('dashboard.modal.fields.reservationId'),
      t('history.csv.date'),
      t('history.csv.time'),
      t('dashboard.modal.fields.name'),
      t('dashboard.modal.fields.furigana'),
      t('dashboard.modal.fields.birthdate'),
      t('dashboard.modal.fields.address'),
      t('dashboard.modal.fields.phone'),
      t('dashboard.modal.fields.email'),
      t('dashboard.modal.fields.gender'),
      t('dashboard.modal.fields.visitType'),
      t('dashboard.modal.fields.insurance'),
      t('dashboard.modal.fields.symptoms'),
      t('dashboard.modal.fields.notes'),
      t('dashboard.modal.fields.contactMethod'),
      t('dashboard.modal.fields.reservationStatus'),
      t('dashboard.modal.fields.createdAt'),
      t('history.modal.fields.completedAt'),
      t('history.modal.fields.completedBy'),
    ],
    statusLabels: {
      pending:   t('dashboard.status.pending'),
      confirmed: t('dashboard.status.confirmed'),
      cancelled: t('dashboard.status.cancelled'),
      completed: t('dashboard.status.completed'),
    },
    filename: `${t('history.csv.filename')}${new Date().toISOString().slice(0, 10)}.csv`,
  };

  if (loading) return <Spinner className="py-12" />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* タイトル */}
      <h1 className="text-xl font-heading font-semibold text-navy-700">{t('history.title')}</h1>

      {/* 検索 + CSV */}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {hasFilter && (
                <Button size="sm" variant="ghost" onClick={clearFilters}>
                  {t('history.filter.clearFilters')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {sortKeys.length > 0 && !(sortKeys.length === 1 && sortKeys[0].col === 'datetime' && sortKeys[0].dir === 'desc') && (
                <Button size="sm" variant="ghost" onClick={() => setSortKeys([{ col: 'datetime', dir: 'desc' }])}>
                  {t('history.table.clearSort')}
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => exportVisitHistoriesCsv(sorted, csvLabels)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {t('history.filter.csvExport')}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            <Input
              label={t('history.search.name')}
              placeholder={t('history.search.namePlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Input
              label={t('history.search.zip')}
              placeholder={t('history.search.zipPlaceholder')}
              value={zipSearch}
              onChange={e => setZipSearch(e.target.value)}
            />
            <Input
              label={t('history.search.phone')}
              placeholder={t('history.search.phonePlaceholder')}
              value={phoneSearch}
              onChange={e => setPhoneSearch(e.target.value)}
            />
            <Input
              label={t('history.search.visitDateFrom')}
              type="date"
              value={visitDateFrom}
              onChange={e => setVisitDateFrom(e.target.value)}
            />
            <Input
              label={t('history.search.visitDateTo')}
              type="date"
              value={visitDateTo}
              onChange={e => setVisitDateTo(e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      {/* テーブル */}
      <Card>
        <div className="overflow-x-auto">
          {sorted.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              }
              title={t('history.emptyState')}
              className="py-8"
            />
          ) : (
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-cream-200">
                  <SortableHeader label={t('history.table.visitDateTime')} sortKey="datetime" sortKeys={sortKeys} onSort={handleSort} />
                  <SortableHeader label={t('history.table.name')} sortKey="name" sortKeys={sortKeys} onSort={handleSort} />
                  <SortableHeader label={t('history.table.visitType')} sortKey="visitType" sortKeys={sortKeys} onSort={handleSort} />
                  <SortableHeader label={t('history.table.phone')} sortKey="phone" sortKeys={sortKeys} onSort={handleSort} />
                  <th className="px-3 py-3 text-[11px] font-medium text-navy-400 whitespace-nowrap tracking-wider uppercase text-left bg-cream-100/50 last:rounded-tr-lg" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
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
                    <td className="px-3 py-3 whitespace-nowrap text-navy-500 font-mono text-xs">{r.phone}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {t('history.action.detail')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* 詳細モーダル（閲覧のみ） */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={t('history.modal.historyDetail')} className="max-w-lg">
          <div className="overflow-y-auto -mx-5 px-5" style={{ maxHeight: 'calc(85vh - 10rem)' }}>
            <dl className="space-y-1 text-sm">
              {[
                [t('dashboard.modal.fields.reservationId'), selected.reservationId],
                [t('dashboard.modal.fields.scheduledDateTime'), formatDateTimeJa(selected.date, selected.time)],
                [t('dashboard.modal.fields.name'), selected.name],
                [t('dashboard.modal.fields.furigana'), selected.furigana],
                [t('dashboard.modal.fields.birthdate'), selected.birthdate + (calcAge(selected.birthdate) !== null ? `（${calcAge(selected.birthdate)}${t('dashboard.modal.fields.ageUnit')}）` : '')],
                [t('dashboard.modal.fields.zip'), selected.zip || '-'],
                [t('dashboard.modal.fields.address'), selected.address],
                [t('dashboard.modal.fields.phone'), selected.phone],
                [t('dashboard.modal.fields.email'), selected.email || '-'],
                [t('dashboard.modal.fields.gender'), selected.gender || t('dashboard.modal.fields.genderUnset')],
                [t('dashboard.modal.fields.visitType'), selected.visitType || '-'],
                [t('dashboard.modal.fields.insurance'), selected.insurance || '-'],
                [t('dashboard.modal.fields.symptoms'), selected.symptoms],
                [t('dashboard.modal.fields.notes'), selected.notes || t('dashboard.modal.fields.noNotes')],
                [t('dashboard.modal.fields.contactMethod'), selected.contactMethod || '-'],
                [t('dashboard.modal.fields.reservationStatus'), t(`dashboard.status.${selected.reservationStatus}`)],
                ...(selected.cancelledBy ? [
                  [t('dashboard.modal.fields.cancelledBy'), selected.cancelledBy === 'admin' ? t('dashboard.status.cancelledByAdmin') : t('dashboard.status.cancelledByPatient')],
                  [t('dashboard.modal.fields.cancelReason'), selected.cancelReason || '-'],
                  [t('dashboard.modal.fields.cancelledAt'), selected.cancelledAt ? new Date(selected.cancelledAt).toLocaleString('ja-JP') : '-'],
                ] : []),
                [t('dashboard.modal.fields.createdAt'), selected.reservationCreatedAt ? new Date(selected.reservationCreatedAt).toLocaleString('ja-JP') : '-'],
                [t('history.modal.fields.completedAt'), selected.completedAt ? new Date(selected.completedAt).toLocaleString('ja-JP') : '-'],
                [t('history.modal.fields.completedBy'), selected.completedByEmail || '-'],
              ].map(([label, val]) => (
                <div key={label} className="flex border-b border-cream-200/80 py-2">
                  <dt className="w-24 shrink-0 text-navy-400">{label}</dt>
                  <dd className="text-navy-700 whitespace-pre-wrap break-all">{val}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t border-cream-200/60 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              {t('history.modal.close')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
