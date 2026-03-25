import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useVisitHistories, exportVisitHistoriesCsv, useCorrections, correctVisitHistory } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/useToast';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SortableHeader, toggleSortKey, multiSort, type SortKey } from '@/components/shared/SortableHeader';
import { formatDateTimeJa, calcAge } from '@/utils/date';
import { cn } from '@/utils/cn';
import { lookupZip } from '@/utils/zip';
import { isValidPhone, isValidEmail, isValidZip, isValidFurigana } from '@/utils/validation';
import type { VisitHistoryRecord, CorrectionRecord } from '@/types/reservation';

// ─────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────

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

/** 訂正理由の最大文字数 */
const REASON_MAX_LENGTH = 500;

// ─────────────────────────────────────────────
// フィールド設定
// ─────────────────────────────────────────────

type FieldType = 'text' | 'date' | 'time' | 'tel' | 'email' | 'select' | 'zip';

interface FieldConfig {
  type: FieldType;
  options?: { value: string; label: string }[];
  validate?: (v: string) => boolean;
  maxLength?: number;
}

const FIELD_CONFIG: Record<string, FieldConfig> = {
  name:      { type: 'text', maxLength: 50 },
  furigana:  { type: 'text', validate: isValidFurigana, maxLength: 50 },
  birthdate: { type: 'date' },
  zip:       { type: 'zip', validate: isValidZip, maxLength: 8 },
  address:   { type: 'text', maxLength: 200 },
  phone:     { type: 'tel', validate: isValidPhone, maxLength: 20 },
  email:     { type: 'email', validate: (v) => !v || isValidEmail(v), maxLength: 200 },
  gender: {
    type: 'select',
    options: [
      { value: '男性', label: '男性' },
      { value: '女性', label: '女性' },
      { value: '', label: '未設定' },
    ],
  },
  insurance: {
    type: 'select',
    options: [
      { value: '保険あり', label: '保険あり' },
      { value: '保険なし', label: '保険なし' },
    ],
  },
  date: { type: 'date' },
  time: { type: 'time' },
};

// ─────────────────────────────────────────────
// ユーティリティ関数
// ─────────────────────────────────────────────

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

/** 日付文字列が安全にパース可能か確認し、フォーマットする */
function safeFormatDatetime(dateStr: string, timeStr: string): string {
  if (!dateStr || !timeStr) return '-';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return `${dateStr} ${timeStr}`;
  const [y, m, d] = parts;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return `${dateStr} ${timeStr}`;
  return formatDateTimeJa(dateStr, timeStr);
}

// ─────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────

export default function VisitHistory() {
  const { t, i18n } = useTranslation('admin');
  const { showToast } = useToast();
  const { histories, loading } = useVisitHistories();

  // 検索フィルター
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [corrZipMsg, setCorrZipMsg] = useState('');

  // corrections リアルタイム購読
  const { corrections, loading: correctionsLoading } = useCorrections(selected?.id);

  // selected が変わったら訂正フォームをリセット
  useEffect(() => {
    setCorrectFormOpen(false);
    setCorrectReason('');
    setCorrectAddendum('');
    setSelectedFields(new Set());
    setFieldValues({});
    setFieldErrors({});
    setCorrZipMsg('');
    setConfirmOpen(false);
  }, [selected?.id]);

  // マージ済みデータ
  const mergedData = useMemo(() => {
    if (!selected) return {} as Record<string, string>;
    return mergeCorrections(selected, corrections);
  }, [selected, corrections]);

  // 最新の addendum
  const latestAddendum = useMemo(() => getLatestAddendum(corrections), [corrections]);

  // 訂正済みフィールド数
  const correctedCount = useMemo(() => {
    const fields = new Set<string>();
    for (const c of corrections) {
      if (c.fields) {
        for (const k of Object.keys(c.fields)) fields.add(k);
      }
    }
    return fields.size;
  }, [corrections]);

  // ─── ZIP自動取得 ───────────────────────────────
  const updateFieldValueRef = useRef(
    (field: string, value: string) => {
      setFieldValues(prev => ({ ...prev, [field]: value }));
    }
  );

  useEffect(() => {
    if (!selectedFields.has('zip')) return;
    const digits = (fieldValues['zip'] || '').replace(/[^\d]/g, '');
    if (digits.length !== 7) { setCorrZipMsg(''); return; }
    setCorrZipMsg('検索中...');
    const timer = setTimeout(async () => {
      try {
        const addr = await lookupZip(digits);
        if (addr) {
          setCorrZipMsg('住所を自動入力しました');
          setSelectedFields(prev => { const n = new Set(prev); n.add('address'); return n; });
          updateFieldValueRef.current('address', addr);
        } else {
          setCorrZipMsg('住所が見つかりませんでした');
        }
      } catch {
        setCorrZipMsg('住所取得に失敗しました');
      }
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldValues['zip'], selectedFields.has('zip')]);

  // ─── フィルター ────────────────────────────────
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

  // ─── 訂正フォームハンドラー ────────────────────
  const openCorrectForm = useCallback(() => {
    setCorrectReason('');
    setCorrectAddendum('');
    setSelectedFields(new Set());
    setFieldValues({});
    setFieldErrors({});
    setCorrZipMsg('');
    setConfirmOpen(false);
    setCorrectFormOpen(true);
  }, []);

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
        setFieldErrors(fe => {
          const copy = { ...fe };
          delete copy[field];
          return copy;
        });
      } else {
        next.add(field);
        // フィールドを追加したら現在値をデフォルトとしてセット
        const currentVal = mergedData[field] ?? '';
        setFieldValues(fv => ({ ...fv, [field]: currentVal }));
      }
      return next;
    });
  }, [mergedData]);

  const updateFieldValue = useCallback((field: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
    const config = FIELD_CONFIG[field];
    if (config?.validate && value.trim()) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: config.validate!(value) ? '' : '入力値が不正です',
      }));
    } else {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, []);

  // refを最新の updateFieldValue に同期
  updateFieldValueRef.current = updateFieldValue;

  const handleSubmitCorrection = useCallback(async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const fields: Record<string, string> = {};
      for (const f of selectedFields) {
        if (fieldValues[f] !== undefined && fieldValues[f].trim() !== '') {
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
      setSelected(null);
      if (result.notified) {
        showToast(t('history.correction.notificationSent'), 'success');
      } else {
        showToast(t('history.correction.notificationSkipped'), 'warning');
      }
    } catch {
      showToast(t('history.correction.failed'), 'error');
    } finally {
      setSubmitting(false);
    }
  }, [selected, selectedFields, fieldValues, correctReason, correctAddendum, showToast, t]);

  // ─── CSV出力ラベル ─────────────────────────────
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

  // ─────────────────────────────────────────────
  // 訂正フォーム：フィールド別入力レンダラー
  // ─────────────────────────────────────────────
  function renderCorrectionInput(field: string, value: string, error: string | undefined) {
    const config = FIELD_CONFIG[field];
    if (!config) return <Input value={value} onChange={e => updateFieldValue(field, e.target.value)} error={error} />;

    switch (config.type) {
      case 'select':
        return (
          <Select
            options={config.options!}
            value={value}
            onChange={e => updateFieldValue(field, e.target.value)}
            error={error}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={e => updateFieldValue(field, e.target.value)}
            error={error}
          />
        );
      case 'time':
        return (
          <Input
            type="time"
            step={1800}
            value={value}
            onChange={e => updateFieldValue(field, e.target.value)}
            error={error}
          />
        );
      case 'tel':
        return (
          <Input
            type="tel"
            value={value}
            onChange={e => updateFieldValue(field, e.target.value)}
            maxLength={config.maxLength}
            error={error}
          />
        );
      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={e => updateFieldValue(field, e.target.value)}
            maxLength={config.maxLength}
            error={error}
          />
        );
      case 'zip':
        return (
          <Input
            value={value}
            onChange={e => updateFieldValue(field, e.target.value)}
            maxLength={config.maxLength}
            error={error}
            placeholder="1234567"
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={e => updateFieldValue(field, e.target.value)}
            maxLength={config.maxLength}
            error={error}
          />
        );
    }
  }

  // ─────────────────────────────────────────────
  // 詳細モーダル：フィールド行ヘルパー
  // ─────────────────────────────────────────────
  const val = (field: string, fallback?: string) => {
    if (!selected) return fallback || '-';
    const correctedVal = mergedData[field];
    if (correctedVal !== undefined && correctedVal !== null) return correctedVal || fallback || '-';
    return (selected as unknown as Record<string, string>)[field] || fallback || '-';
  };

  const corrBadge = (field: string) =>
    isCorrected(field, corrections)
      ? <Badge className="bg-amber-50 text-amber-700 border border-amber-200 ml-2 text-[10px]">{t('history.correction.badge')}</Badge>
      : null;

  const corrClass = (field: string) =>
    isCorrected(field, corrections) ? 'border-l-2 border-gold pl-2' : '';

  // ─────────────────────────────────────────────
  // メインレンダリング
  // ─────────────────────────────────────────────
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-navy-700 font-medium">{r.name}</span>
                        {r.bookedBy === 'admin' && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            {t('adminProxy.badge')}
                          </span>
                        )}
                      </div>
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

      {/* ─── 詳細モーダル ─────────────────────────── */}
      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={t('history.modal.historyDetail')}
          className="max-w-xl"
        >
          <div className="overflow-y-auto -mx-5 px-5" style={{ maxHeight: 'calc(85vh - 10rem)' }}>
            {correctionsLoading ? (
              <Spinner className="py-4" />
            ) : (
              <div className="space-y-6">
                {/* ── 管理者代行バナー ──────────────────── */}
                {selected.bookedBy === 'admin' && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span className="text-sm font-medium text-amber-800">{t('adminProxy.banner')}</span>
                  </div>
                )}
                {/* ── Patient hero ─────────────────────── */}
                <div className="flex items-start gap-4">
                  {/* イニシャルアバター */}
                  <div className="w-12 h-12 rounded-full bg-navy-700 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-lg font-display font-medium text-cream-100">
                      {(mergedData['name'] || selected.name || '?').charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-display font-medium text-navy-700 truncate">
                        {mergedData['name'] || selected.name}
                      </h3>
                      {correctedCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                          </svg>
                          {correctedCount}件訂正済
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-navy-400 mt-0.5">
                      {mergedData['furigana'] || selected.furigana}
                    </p>
                    {/* 来院日時カード */}
                    <div className="mt-2 inline-flex items-center gap-2 bg-navy-700/5 border border-navy-700/10 rounded-lg px-3 py-1.5">
                      <svg className="w-3.5 h-3.5 text-navy-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                      </svg>
                      <span className="text-sm font-mono font-medium text-navy-700">
                        {safeFormatDatetime(val('date', selected.date), val('time', selected.time))}
                      </span>
                      {(isCorrected('date', corrections) || isCorrected('time', corrections)) && corrBadge('date')}
                    </div>
                  </div>
                </div>

                {/* ── 患者情報 ──────────────────────────── */}
                <section className="space-y-2">
                  <h4 className="text-[10px] font-body tracking-[0.2em] uppercase text-navy-400 pb-1.5 border-b border-cream-200">
                    患者情報
                  </h4>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.name')}</dt>
                    <dd className={cn('text-navy-700 flex items-center gap-1 flex-wrap', corrClass('name'))}>
                      {val('name')}{corrBadge('name')}
                    </dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.furigana')}</dt>
                    <dd className={cn('text-navy-700 flex items-center gap-1 flex-wrap', corrClass('furigana'))}>
                      {val('furigana')}{corrBadge('furigana')}
                    </dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.birthdate')}</dt>
                    <dd className={cn('text-navy-700 flex items-center gap-1 flex-wrap', corrClass('birthdate'))}>
                      {val('birthdate')}
                      {calcAge(val('birthdate', selected.birthdate)) !== null && (
                        <span className="text-navy-400 text-xs">
                          （{calcAge(val('birthdate', selected.birthdate))}{t('dashboard.modal.fields.ageUnit')}）
                        </span>
                      )}
                      {corrBadge('birthdate')}
                    </dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.gender')}</dt>
                    <dd className={cn('text-navy-700 flex items-center gap-1 flex-wrap', corrClass('gender'))}>
                      {val('gender') || t('dashboard.modal.fields.genderUnset')}{corrBadge('gender')}
                    </dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.zip')}</dt>
                    <dd className={cn('text-navy-700 flex items-center gap-1 flex-wrap font-mono text-xs', corrClass('zip'))}>
                      {val('zip', '-')}{corrBadge('zip')}
                    </dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.address')}</dt>
                    <dd className={cn('text-navy-700 flex items-center gap-1 flex-wrap break-all', corrClass('address'))}>
                      {val('address')}{corrBadge('address')}
                    </dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.phone')}</dt>
                    <dd className={cn('text-navy-700 flex items-center gap-1 flex-wrap font-mono text-xs', corrClass('phone'))}>
                      {val('phone')}{corrBadge('phone')}
                    </dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.email')}</dt>
                    <dd className={cn('text-navy-700 flex items-center gap-1 flex-wrap break-all text-xs', corrClass('email'))}>
                      {val('email', '-')}{corrBadge('email')}
                    </dd>
                  </dl>
                </section>

                {/* ── 診察情報 ──────────────────────────── */}
                <section className="space-y-2">
                  <h4 className="text-[10px] font-body tracking-[0.2em] uppercase text-navy-400 pb-1.5 border-b border-cream-200">
                    診察情報
                  </h4>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.visitType')}</dt>
                    <dd className="text-navy-700">
                      <Badge className={selected.visitType === '初診' ? 'bg-sky-100 text-sky-700' : 'bg-cream-100 text-navy-500'}>
                        {selected.visitType || '-'}
                      </Badge>
                    </dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.insurance')}</dt>
                    <dd className={cn('text-navy-700 flex items-center gap-1 flex-wrap', corrClass('insurance'))}>
                      {val('insurance', '-')}{corrBadge('insurance')}
                    </dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.symptoms')}</dt>
                    <dd className="text-navy-700 whitespace-pre-wrap break-all">{selected.symptoms || '-'}</dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.notes')}</dt>
                    <dd className="text-navy-700 whitespace-pre-wrap break-all">
                      {selected.notes || t('dashboard.modal.fields.noNotes')}
                    </dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.contactMethod')}</dt>
                    <dd className="text-navy-700">{selected.contactMethod || '-'}</dd>

                    {latestAddendum && (
                      <>
                        <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('history.correction.addendum')}</dt>
                        <dd className="text-amber-700 bg-amber-50 rounded px-2 py-1 text-xs break-all">{latestAddendum}</dd>
                      </>
                    )}
                  </dl>
                </section>

                {/* ── 来院記録 ──────────────────────────── */}
                <section className="space-y-2">
                  <h4 className="text-[10px] font-body tracking-[0.2em] uppercase text-navy-400 pb-1.5 border-b border-cream-200">
                    来院記録
                  </h4>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.reservationId')}</dt>
                    <dd className="text-navy-700 font-mono text-xs">{selected.reservationId}</dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.reservationStatus')}</dt>
                    <dd className="text-navy-700">{t(`dashboard.status.${selected.reservationStatus}`)}</dd>

                    {selected.cancelledBy && (
                      <>
                        <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.cancelledBy')}</dt>
                        <dd className="text-navy-700">
                          {selected.cancelledBy === 'admin'
                            ? t('dashboard.status.cancelledByAdmin')
                            : t('dashboard.status.cancelledByPatient')}
                        </dd>
                        <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.cancelReason')}</dt>
                        <dd className="text-navy-700 break-all">{selected.cancelReason || '-'}</dd>
                        <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.cancelledAt')}</dt>
                        <dd className="text-navy-700 font-mono text-xs">
                          {selected.cancelledAt ? new Date(selected.cancelledAt).toLocaleString('ja-JP') : '-'}
                        </dd>
                      </>
                    )}

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('dashboard.modal.fields.createdAt')}</dt>
                    <dd className="text-navy-700 font-mono text-xs">
                      {selected.reservationCreatedAt ? new Date(selected.reservationCreatedAt).toLocaleString('ja-JP') : '-'}
                    </dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('history.modal.fields.completedAt')}</dt>
                    <dd className="text-navy-700 font-mono text-xs">
                      {selected.completedAt ? new Date(selected.completedAt).toLocaleString('ja-JP') : '-'}
                    </dd>

                    <dt className="text-navy-400 shrink-0 pt-0.5 text-xs">{t('history.modal.fields.completedBy')}</dt>
                    <dd className="text-navy-700 text-xs">{selected.completedByEmail || '-'}</dd>
                  </dl>
                </section>

                {/* ── 訂正履歴タイムライン ───────────────── */}
                {corrections.length > 0 && (
                  <div>
                    <h4 className="text-[10px] tracking-[0.2em] uppercase text-navy-400 pb-2 border-b border-cream-200 mb-4">
                      {t('history.correction.historyToggle', { count: corrections.length })}
                    </h4>
                    <div className="space-y-4 relative">
                      {/* タイムライン縦線 */}
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-cream-200" />
                      {corrections.map((c) => (
                        <div key={c.id} className="flex gap-3 relative">
                          {/* タイムラインドット */}
                          <div className="w-3.5 h-3.5 rounded-full bg-navy-200 border-2 border-white ring-1 ring-navy-300 shrink-0 mt-1 z-10" />
                          <div className="flex-1 bg-cream-100/60 rounded-lg border border-cream-200 p-3 text-xs space-y-2">
                            {/* ヘッダー */}
                            <div className="flex justify-between items-center text-navy-400">
                              <span className="font-mono">
                                {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(c.correctedAt))}
                              </span>
                              <span className="truncate ml-2 max-w-[12rem]">{c.correctedByEmail}</span>
                            </div>
                            {/* 変更フィールド */}
                            {c.fields && Object.keys(c.fields).length > 0 && (
                              <div className="space-y-1.5">
                                {Object.entries(c.fields).map(([field, newVal]) => {
                                  const original = c.beforeValues?.[field] ?? (selected as unknown as Record<string, string>)[field] ?? '';
                                  return (
                                    <div key={field} className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-medium text-navy-500 w-14 shrink-0 text-[11px]">
                                        {t(FIELD_LABEL_KEYS[field] || field)}
                                      </span>
                                      <span className="text-navy-300 line-through text-[11px]">{original || '-'}</span>
                                      <svg className="w-3 h-3 text-navy-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                      </svg>
                                      <span className="text-navy-700 font-medium">{newVal || '-'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* 訂正理由 */}
                            {c.reason && (
                              <p className="text-navy-500">
                                <span className="font-medium text-navy-600">{t('history.correction.reason')}:</span>{' '}
                                {c.reason}
                              </p>
                            )}
                            {/* 追記 */}
                            {c.addendum && (
                              <p className="text-amber-700 bg-amber-50 rounded px-2 py-1">
                                <span className="font-medium">{t('history.correction.addendum')}:</span>{' '}
                                {c.addendum}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="flex gap-2 justify-end pt-4 border-t border-cream-200/60 mt-4">
            <Button variant="secondary" size="sm" onClick={openCorrectForm}>
              {t('history.action.correct')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              {t('history.modal.close')}
            </Button>
          </div>
        </Modal>
      )}

      {/* ─── 訂正フォームモーダル ──────────────────── */}
      {correctFormOpen && selected && (
        <Modal
          open={correctFormOpen}
          onClose={() => setCorrectFormOpen(false)}
          title={t('history.correction.title')}
          className="max-w-lg"
        >
          <div className="overflow-y-auto -mx-5 px-5 space-y-5" style={{ maxHeight: 'calc(85vh - 10rem)' }}>
            {/* フィールド選択グリッド */}
            <div>
              <p className="text-xs tracking-wider uppercase text-navy-400 font-body mb-3">
                {t('history.correction.selectFields')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CORRECTABLE_FIELDS.map(field => {
                  const isChecked = selectedFields.has(field);
                  const currentVal = mergedData[field] ?? (selected as unknown as Record<string, string>)[field] ?? '';
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() => toggleField(field)}
                      className={cn(
                        'text-left rounded-lg border px-3 py-2 text-sm transition-all',
                        isChecked
                          ? 'border-gold bg-gold/5 text-navy-700 shadow-sm'
                          : 'border-cream-200 bg-white text-navy-500 hover:border-navy-300',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0',
                          isChecked ? 'bg-navy-700 border-navy-700' : 'border-cream-300',
                        )}>
                          {isChecked && (
                            <svg className="w-2.5 h-2.5 text-cream-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-xs">{t(FIELD_LABEL_KEYS[field])}</span>
                      </div>
                      <p className="text-[11px] text-navy-400 mt-0.5 ml-6 truncate">
                        {currentVal || '-'}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* 選択フィールドの入力エリア */}
              {selectedFields.size > 0 && (
                <div className="space-y-3 mt-3 bg-cream-100/50 rounded-lg p-3 border border-cream-200">
                  <p className="text-[11px] text-navy-400 font-medium tracking-wide">訂正後の値を入力</p>
                  {Array.from(selectedFields).map(field => (
                    <div key={field}>
                      <p className="text-xs text-navy-400 mb-1.5">
                        {t(FIELD_LABEL_KEYS[field])} — 訂正後の値
                      </p>
                      {renderCorrectionInput(field, fieldValues[field] ?? '', fieldErrors[field])}
                      {field === 'zip' && corrZipMsg && (
                        <p className={cn(
                          'text-[11px] mt-0.5',
                          corrZipMsg.includes('自動入力') ? 'text-green-600' : 'text-navy-400',
                        )}>
                          {corrZipMsg}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
              disabled={
                !correctReason.trim() ||
                (selectedFields.size === 0 && !correctAddendum.trim()) ||
                Array.from(selectedFields).some(f => !!fieldErrors[f])
              }
              onClick={() => setConfirmOpen(true)}
            >
              {t('history.correction.submit')}
            </Button>
          </div>
        </Modal>
      )}

      {/* ─── 確認ダイアログ ───────────────────────── */}
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
