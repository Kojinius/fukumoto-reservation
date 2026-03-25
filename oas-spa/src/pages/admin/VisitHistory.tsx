import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useVisitHistories, exportVisitHistoriesCsv, useCorrections, correctVisitHistory } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/useToast';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SortableHeader, toggleSortKey, multiSort, type SortKey } from '@/components/shared/SortableHeader';
import { formatDateTimeJa, calcAge } from '@/utils/date';
import type { VisitHistoryRecord, CorrectionRecord } from '@/types/reservation';

/** 訂正可能フィールドのホワイトリスト */
const CORRECTABLE_FIELDS = [
  'name', 'furigana', 'birthdate', 'zip', 'address',
  'phone', 'email', 'gender', 'insurance', 'date', 'time',
] as const;

/** フィールド名から i18n キーへのマッピング */
const FIELD_LABEL_KEYS: Record<string, string> = {
  name:      'dashboard.modal.fields.name',
  furigana:  'dashboard.modal.fields.furigana',
  birthdate: 'dashboard.modal.fields.birthdate',
  zip:       'dashboard.modal.fields.zip',
  address:   'dashboard.modal.fields.address',
  phone:     'dashboard.modal.fields.phone',
  email:     'dashboard.modal.fields.email',
  gender:    'dashboard.modal.fields.gender',
  insurance: 'dashboard.modal.fields.insurance',
  date:      'history.csv.date',
  time:      'history.csv.time',
};

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

/** 最新 correction の fields をレコードにマージ */
function mergeCorrections(record: VisitHistoryRecord, corrections: CorrectionRecord[]): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const field of CORRECTABLE_FIELDS) {
    merged[field] = (record as unknown as Record<string, string>)[field] ?? '';
  }
  // 古い順に適用（corrections は desc なので reverse）
  const sorted = [...corrections].reverse();
  for (const c of sorted) {
    if (c.fields) {
      for (const [key, val] of Object.entries(c.fields)) {
        if (val !== undefined && val !== null) {
          merged[key] = val;
        }
      }
    }
  }
  return merged;
}

/** あるフィールドが訂正済みか判定 */
function isCorrected(field: string, corrections: CorrectionRecord[]): boolean {
  return corrections.some(c => c.fields && field in c.fields);
}

/** 最新の addendum を取得 */
function getLatestAddendum(corrections: CorrectionRecord[]): string | null {
  for (const c of corrections) {
    if (c.addendum) return c.addendum;
  }
  return null;
}

/** 訂正理由の最大文字数 */
const REASON_MAX_LENGTH = 500;

export default function VisitHistory() {
  const { t } = useTranslation('admin');
  const { showToast } = useToast();
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

  // 訂正フォームモーダル
  const [correctFormOpen, setCorrectFormOpen] = useState(false);
  const [correctReason, setCorrectReason] = useState('');
  const [correctAddendum, setCorrectAddendum] = useState('');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 訂正履歴アコーディオン
  const [historyOpen, setHistoryOpen] = useState(false);

  // corrections リアルタイム購読
  const { corrections, loading: correctionsLoading } = useCorrections(selected?.id);

  // マージ済みデータ
  const mergedData = useMemo(() => {
    if (!selected) return {};
    return mergeCorrections(selected, corrections);
  }, [selected, corrections]);

  // 最新の addendum
  const latestAddendum = useMemo(() => getLatestAddendum(corrections), [corrections]);

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

  /** 訂正フォームを開く */
  const openCorrectForm = useCallback(() => {
    setCorrectReason('');
    setCorrectAddendum('');
    setSelectedFields(new Set());
    setFieldValues({});
    setConfirmOpen(false);
    setCorrectFormOpen(true);
  }, []);

  /** フィールド選択トグル */
  const toggleField = useCallback((field: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
        setFieldValues(fv => {
          const copy = { ...fv };
          delete copy[field];
          return copy;
        });
      } else {
        next.add(field);
      }
      return next;
    });
  }, []);

  /** 訂正フィールドの値更新 */
  const updateFieldValue = useCallback((field: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
  }, []);

  /** 訂正送信 */
  const handleSubmitCorrection = useCallback(async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const fields: Record<string, string> = {};
      for (const f of selectedFields) {
        if (fieldValues[f] !== undefined) {
          fields[f] = fieldValues[f];
        }
      }
      const result = await correctVisitHistory(
        selected.id,
        correctReason,
        Object.keys(fields).length > 0 ? fields : undefined,
        correctAddendum || undefined,
      );
      setCorrectFormOpen(false);
      setConfirmOpen(false);
      if (result.notified) {
        showToast(t('history.correction.notificationSent'), 'success');
      } else {
        showToast(t('history.correction.notificationSkipped'), 'warning');
      }
    } catch {
      showToast('Correction failed', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [selected, selectedFields, fieldValues, correctReason, correctAddendum, showToast, t]);

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

  /** 詳細モーダルの dl 行を構築（訂正済みフィールドにはバッジ付き） */
  const buildDetailRows = () => {
    if (!selected) return [];

    /** フィールドの表示値を取得（訂正済みならマージ済み値） */
    const val = (field: string, fallback?: string) => {
      const correctedVal = mergedData[field];
      if (correctedVal !== undefined && correctedVal !== null) return correctedVal || fallback || '-';
      return (selected as unknown as Record<string, string>)[field] || fallback || '-';
    };

    /** 訂正済みバッジ */
    const badge = (field: string) =>
      isCorrected(field, corrections)
        ? <Badge className="bg-cream-100 text-navy-700 ml-2">{t('history.correction.badge')}</Badge>
        : null;

    return [
      [t('dashboard.modal.fields.reservationId'), <span key="rid">{selected.reservationId}</span>],
      [t('dashboard.modal.fields.scheduledDateTime'), <span key="dt">{formatDateTimeJa(val('date', selected.date), val('time', selected.time))}{badge('date')}{badge('time')}</span>],
      [t('dashboard.modal.fields.name'), <span key="name">{val('name')}{badge('name')}</span>],
      [t('dashboard.modal.fields.furigana'), <span key="furi">{val('furigana')}{badge('furigana')}</span>],
      [t('dashboard.modal.fields.birthdate'), <span key="bd">{val('birthdate') + (calcAge(val('birthdate', selected.birthdate)) !== null ? `（${calcAge(val('birthdate', selected.birthdate))}${t('dashboard.modal.fields.ageUnit')}）` : '')}{badge('birthdate')}</span>],
      [t('dashboard.modal.fields.zip'), <span key="zip">{val('zip', '-')}{badge('zip')}</span>],
      [t('dashboard.modal.fields.address'), <span key="addr">{val('address')}{badge('address')}</span>],
      [t('dashboard.modal.fields.phone'), <span key="phone">{val('phone')}{badge('phone')}</span>],
      [t('dashboard.modal.fields.email'), <span key="email">{val('email', '-')}{badge('email')}</span>],
      [t('dashboard.modal.fields.gender'), <span key="gender">{val('gender') || t('dashboard.modal.fields.genderUnset')}{badge('gender')}</span>],
      [t('dashboard.modal.fields.visitType'), <span key="vt">{selected.visitType || '-'}</span>],
      [t('dashboard.modal.fields.insurance'), <span key="ins">{val('insurance', '-')}{badge('insurance')}</span>],
      [t('dashboard.modal.fields.symptoms'), <span key="sym">{selected.symptoms}</span>],
      [t('dashboard.modal.fields.notes'), <span key="notes">{selected.notes || t('dashboard.modal.fields.noNotes')}</span>],
      // addendum 表示（訂正による追記）
      ...(latestAddendum ? [
        [t('history.correction.addendum'), <span key="addendum" className="text-navy-700">{latestAddendum}</span>],
      ] : []),
      [t('dashboard.modal.fields.contactMethod'), <span key="cm">{selected.contactMethod || '-'}</span>],
      [t('dashboard.modal.fields.reservationStatus'), <span key="rs">{t(`dashboard.status.${selected.reservationStatus}`)}</span>],
      ...(selected.cancelledBy ? [
        [t('dashboard.modal.fields.cancelledBy'), <span key="cb">{selected.cancelledBy === 'admin' ? t('dashboard.status.cancelledByAdmin') : t('dashboard.status.cancelledByPatient')}</span>],
        [t('dashboard.modal.fields.cancelReason'), <span key="cr">{selected.cancelReason || '-'}</span>],
        [t('dashboard.modal.fields.cancelledAt'), <span key="cat">{selected.cancelledAt ? new Date(selected.cancelledAt).toLocaleString('ja-JP') : '-'}</span>],
      ] : []),
      [t('dashboard.modal.fields.createdAt'), <span key="ca">{selected.reservationCreatedAt ? new Date(selected.reservationCreatedAt).toLocaleString('ja-JP') : '-'}</span>],
      [t('history.modal.fields.completedAt'), <span key="coa">{selected.completedAt ? new Date(selected.completedAt).toLocaleString('ja-JP') : '-'}</span>],
      [t('history.modal.fields.completedBy'), <span key="cob">{selected.completedByEmail || '-'}</span>],
    ] as [string, React.ReactNode][];
  };

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

      {/* 詳細モーダル */}
      {selected && (
        <Modal open={!!selected} onClose={() => { setSelected(null); setHistoryOpen(false); }} title={t('history.modal.historyDetail')} className="max-w-lg">
          <div className="overflow-y-auto -mx-5 px-5" style={{ maxHeight: 'calc(85vh - 10rem)' }}>
            {correctionsLoading ? (
              <Spinner className="py-4" />
            ) : (
              <>
                <dl className="space-y-1 text-sm">
                  {buildDetailRows().map(([label, val]) => (
                    <div key={label as string} className="flex border-b border-cream-200/80 py-2">
                      <dt className="w-24 shrink-0 text-navy-400">{label}</dt>
                      <dd className="text-navy-700 whitespace-pre-wrap break-all">{val}</dd>
                    </div>
                  ))}
                </dl>

                {/* 訂正履歴アコーディオン */}
                {corrections.length > 0 && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(prev => !prev)}
                      className="flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-500 transition-colors w-full py-2"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${historyOpen ? 'rotate-90' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      {t('history.correction.historyToggle', { count: corrections.length })}
                    </button>
                    {historyOpen && (
                      <div className="mt-2 space-y-3">
                        {corrections.map((c) => (
                          <Card key={c.id}>
                            <CardBody className="space-y-2 text-xs">
                              <div className="flex items-center justify-between text-navy-400">
                                <span>{new Date(c.correctedAt).toLocaleString('ja-JP')}</span>
                                <span>{c.correctedByEmail}</span>
                              </div>
                              <div className="text-navy-700">
                                <span className="font-medium">{t('history.correction.reason')}:</span> {c.reason}
                              </div>
                              {c.fields && Object.keys(c.fields).length > 0 && (
                                <div className="space-y-1">
                                  {Object.entries(c.fields).map(([field, newVal]) => {
                                    const original = (selected as unknown as Record<string, string>)[field] ?? '';
                                    return (
                                      <div key={field} className="flex items-center gap-2 text-xs">
                                        <span className="font-medium text-navy-500 w-16 shrink-0">
                                          {t(FIELD_LABEL_KEYS[field] || field)}
                                        </span>
                                        <span className="text-navy-400 line-through">{t('history.correction.changedFrom')}: {original || '-'}</span>
                                        <svg className="w-3 h-3 text-navy-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                        </svg>
                                        <span className="text-navy-700 font-medium">{t('history.correction.changedTo')}: {newVal || '-'}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {c.addendum && (
                                <div className="text-navy-600">
                                  <span className="font-medium">{t('history.correction.addendum')}:</span> {c.addendum}
                                </div>
                              )}
                            </CardBody>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t border-cream-200/60 mt-4">
            <Button variant="secondary" size="sm" onClick={openCorrectForm}>
              {t('history.action.correct')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setHistoryOpen(false); }}>
              {t('history.modal.close')}
            </Button>
          </div>
        </Modal>
      )}

      {/* 訂正フォームモーダル */}
      {correctFormOpen && selected && (
        <Modal
          open={correctFormOpen}
          onClose={() => setCorrectFormOpen(false)}
          title={t('history.correction.title')}
          className="max-w-lg"
        >
          <div className="overflow-y-auto -mx-5 px-5 space-y-5" style={{ maxHeight: 'calc(85vh - 10rem)' }}>
            {/* フィールド選択セクション */}
            <div>
              <p className="text-xs tracking-wider uppercase text-navy-400 font-body mb-2">
                {t('history.correction.selectFields')}
              </p>
              <div className="space-y-2">
                {CORRECTABLE_FIELDS.map(field => {
                  const isChecked = selectedFields.has(field);
                  const currentVal = mergedData[field] ?? (selected as unknown as Record<string, string>)[field] ?? '';
                  return (
                    <div key={field} className="space-y-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-navy-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleField(field)}
                          className="rounded border-cream-300 text-navy-700 focus:ring-gold/30"
                        />
                        {t(FIELD_LABEL_KEYS[field] || field)}
                      </label>
                      {isChecked && (
                        <div className="ml-6 grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[11px] text-navy-400 mb-1">{t('history.correction.currentValue')}</p>
                            <p className="text-sm text-navy-500 bg-cream-100 rounded px-2 py-1.5 break-all">{currentVal || '-'}</p>
                          </div>
                          <Input
                            label={t('history.correction.newValue')}
                            value={fieldValues[field] ?? ''}
                            onChange={e => updateFieldValue(field, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 追記セクション */}
            <div>
              <Textarea
                label={t('history.correction.addendum')}
                placeholder={t('history.correction.addendumPlaceholder')}
                value={correctAddendum}
                onChange={e => setCorrectAddendum(e.target.value)}
                rows={3}
              />
              <p className="text-[11px] text-navy-400 mt-1">
                {t('history.correction.addendumHint')}
              </p>
            </div>

            {/* 訂正理由（必須） */}
            <div>
              <Textarea
                label={t('history.correction.reason')}
                placeholder={t('history.correction.reasonPlaceholder')}
                value={correctReason}
                onChange={e => {
                  if (e.target.value.length <= REASON_MAX_LENGTH) {
                    setCorrectReason(e.target.value);
                  }
                }}
                rows={4}
                required
              />
              <p className="text-[11px] text-navy-400 mt-1 text-right">
                {correctReason.length} / {REASON_MAX_LENGTH}
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-cream-200/60 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setCorrectFormOpen(false)}>
              {t('history.modal.close')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!correctReason.trim() || (selectedFields.size === 0 && !correctAddendum.trim())}
              onClick={() => setConfirmOpen(true)}
            >
              {t('history.correction.submit')}
            </Button>
          </div>
        </Modal>
      )}

      {/* 確認ダイアログ */}
      {confirmOpen && (
        <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} className="max-w-sm">
          <p className="text-sm text-navy-700 mb-4">{t('history.correction.confirm')}</p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              {t('history.modal.close')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={submitting}
              onClick={handleSubmitCorrection}
            >
              {t('history.correction.submit')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
