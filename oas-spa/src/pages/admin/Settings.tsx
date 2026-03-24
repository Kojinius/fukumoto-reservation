import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/firebase';
import { useClinic } from '@/hooks/useClinic';
import { useToast } from '@/hooks/useToast';
import { useAdminUsers, createAdminUser, deleteAdminUser, maskEmail } from '@/hooks/useAdmin';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { lookupZip } from '@/utils/zip';
import { isStrongPassword, isValidEmail } from '@/utils/validation';
import { toHankaku } from '@/utils/security';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { cn } from '@/utils/cn';
import type { ClinicSettings, DaySchedule } from '@/types/clinic';
import { DEFAULT_BUSINESS_HOURS } from '@/types/clinic';

// タブキー（内部識別用）— ラベルはi18nで取得
const TAB_KEYS = ['basicInfo', 'businessDays', 'announcement', 'terms', 'policy', 'accounts'] as const;
type TabKey = typeof TAB_KEYS[number];

/** 時刻文字列→分数に変換（比較用） */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** 時刻セレクト用の選択肢を生成（30分刻み） */
function generateTimeOptions(startHour: number, endHour: number): string[] {
  const opts: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    opts.push(`${h}:00`);
    if (h < endHour) opts.push(`${h}:30`);
  }
  return opts;
}
const AM_TIMES = generateTimeOptions(6, 12);   // 6:00〜12:00
const PM_TIMES = generateTimeOptions(13, 22);  // 13:00〜22:00


export default function Settings() {
  const { t } = useTranslation('admin');
  const { t: tToast } = useTranslation('toast');
  const { clinic, loading: clinicLoading } = useClinic();
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabKey>('basicInfo');
  const [saving, setSaving] = useState(false);
  const adminUsers = useAdminUsers();

  // 編集中のデータ（clinic からコピー）
  const [form, setForm] = useState<Partial<ClinicSettings>>({});

  // clinic ロード後にフォームを初期化
  useEffect(() => {
    if (clinic) setForm({ ...clinic });
  }, [clinic]);

  // 管理者ユーザー一覧を1回だけ取得
  useEffect(() => { adminUsers.fetchUsers(); }, []);

  function update(patch: Partial<ClinicSettings>) {
    setForm(prev => ({ ...prev, ...patch }));
  }

  /** 設定保存 */
  async function handleSave() {
    if (!form.clinicName?.trim()) { showToast(t('settings.validation.clinicNameRequired'), 'error'); return; }
    if (!form.phone?.trim()) { showToast(t('settings.validation.phoneRequired'), 'error'); return; }
    const ann = form.announcement;
    if (ann?.startDate && ann?.endDate && ann.startDate > ann.endDate) {
      showToast(t('settings.validation.announcementDateError'), 'error'); return;
    }
    const mt = form.maintenance;
    if (mt?.startDate && mt?.endDate && mt.startDate > mt.endDate) {
      showToast(t('settings.validation.maintenanceDateError'), 'error'); return;
    }
    const bhCheck = form.businessHours || DEFAULT_BUSINESS_HOURS;
    const weekdaysValidation = t('settings.weekdays', { returnObjects: true }) as string[];
    for (let i = 0; i < 7; i++) {
      const d = bhCheck[String(i)];
      if (!d?.open) continue;
      if (d.amOpen && timeToMinutes(d.amStart) >= timeToMinutes(d.amEnd)) {
        showToast(t('settings.validation.businessHoursError', { weekday: weekdaysValidation[i], session: t('settings.validation.amSession') }), 'error'); return;
      }
      if (d.pmOpen && timeToMinutes(d.pmStart) >= timeToMinutes(d.pmEnd)) {
        showToast(t('settings.validation.businessHoursError', { weekday: weekdaysValidation[i], session: t('settings.validation.pmSession') }), 'error'); return;
      }
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'clinic'), {
        ...form,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      showToast(tToast('settingSaved'), 'success');
    } catch {
      showToast(tToast('saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (clinicLoading) return <Spinner className="py-12" />;

  // タブキーと表示ラベルのマッピング
  const TAB_LABEL_MAP: Record<TabKey, string> = {
    basicInfo: t('settings.tabs.basicInfo'),
    businessDays: t('settings.tabs.businessDays'),
    announcement: t('settings.tabs.announcement'),
    terms: t('settings.tabs.terms'),
    policy: t('settings.tabs.policy'),
    accounts: t('settings.tabs.accounts'),
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold text-navy-700">{t('settings.title')}</h2>
        <Button onClick={handleSave} loading={saving}>{t('settings.save')}</Button>
      </div>

      {/* タブ */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TAB_KEYS.map(tabKey => (
          <Button key={tabKey} size="sm" variant={tab === tabKey ? 'primary' : 'ghost'} onClick={() => setTab(tabKey)}>
            {TAB_LABEL_MAP[tabKey]}
          </Button>
        ))}
      </div>

      {tab === 'basicInfo' && <BasicInfoTab form={form} update={update} />}
      {tab === 'businessDays' && <BusinessDayTab form={form} update={update} showToast={showToast} />}
      {tab === 'announcement' && <AnnouncementTab form={form} update={update} showToast={showToast} />}
      {tab === 'terms' && <TermsTab form={form} update={update} />}
      {tab === 'policy' && <PolicyTab form={form} update={update} />}
      {tab === 'accounts' && <AccountsTab adminUsers={adminUsers} />}
    </div>
  );
}

/* ── 基本情報タブ ── */
function BasicInfoTab({ form, update }: { form: Partial<ClinicSettings>; update: (p: Partial<ClinicSettings>) => void }) {
  const { t } = useTranslation('admin');
  const [zipMsg, setZipMsg] = useState('');
  const updateRef = useRef(update);
  updateRef.current = update;
  const userEditedZip = useRef(false);

  /* 郵便番号自動検索（ユーザー操作時のみ） */
  useEffect(() => {
    if (!userEditedZip.current) return;
    const digits = (form.clinicZip || '').replace(/[^\d]/g, '');
    if (digits.length !== 7) { setZipMsg(''); return; }
    setZipMsg(t('settings.basicInfo.zipSearching'));
    const timer = setTimeout(async () => {
      try {
        const addr = await lookupZip(digits);
        if (addr) {
          updateRef.current({ clinicAddress: addr });
          setZipMsg(t('settings.basicInfo.zipFound'));
        } else {
          setZipMsg(t('settings.basicInfo.zipNotFound'));
        }
      } catch {
        setZipMsg(t('settings.basicInfo.zipError'));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.clinicZip]);

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_12rem] gap-4">
          <Input label={t('settings.basicInfo.clinicName')} value={form.clinicName || ''} onChange={e => update({ clinicName: e.target.value })} />
          <Input label={t('settings.basicInfo.phone')} value={form.phone || ''} onChange={e => update({ phone: e.target.value })} />
        </div>
        <Input label={t('settings.basicInfo.websiteUrl')} value={form.clinicUrl || ''} onChange={e => update({ clinicUrl: e.target.value })} />
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs tracking-wider uppercase text-navy-400 font-body mb-1.5">{t('settings.basicInfo.zip')}</label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-navy-400 font-medium shrink-0">{t('settings.basicInfo.zipPrefix')}</span>
              <input
                value={form.clinicZip || ''}
                onChange={e => {
                  userEditedZip.current = true;
                  let digits = e.target.value.replace(/[^\d]/g, '');
                  if (digits.length > 7) digits = digits.slice(0, 7);
                  const formatted = digits.length > 3 ? digits.slice(0, 3) + '-' + digits.slice(3) : digits;
                  update({ clinicZip: formatted });
                }}
                placeholder={t('settings.basicInfo.zipPlaceholder')}
                maxLength={8}
                className="w-28 rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm font-body text-navy-700 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all duration-200 hover:border-navy-200"
              />
              {zipMsg && (
                <span className={`text-xs font-bold whitespace-nowrap ${zipMsg === t('settings.basicInfo.zipFound') ? 'text-success' : zipMsg === t('settings.basicInfo.zipSearching') ? 'text-navy-400' : 'text-danger'}`}>{zipMsg}</span>
              )}
            </div>
          </div>
        </div>
        <Input label={t('settings.basicInfo.address')} value={form.clinicAddress || ''} onChange={e => update({ clinicAddress: e.target.value })} />
        <Input label={t('settings.basicInfo.addressSub')} value={form.clinicAddressSub || ''} onChange={e => update({ clinicAddressSub: e.target.value })} />

        {/* Google Maps Embed（住所が入力されている場合） */}
        {form.clinicAddress && (
          <div className="mt-1">
            <label className="block text-xs tracking-wider uppercase text-navy-400 font-body mb-1.5">{t('settings.basicInfo.mapLabel')}</label>
            <div className="rounded-lg overflow-hidden border border-cream-300">
              <iframe
                title={t('settings.basicInfo.mapTitle')}
                width="100%"
                height="200"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent((form.clinicAddress || '') + ' ' + (form.clinicAddressSub || ''))}&output=embed&hl=ja`}
              />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/* ── 営業日設定タブ（ビジュアル統合デザイン） ── */
function BusinessDayTab({ form, update, showToast }: { form: Partial<ClinicSettings>; update: (p: Partial<ClinicSettings>) => void; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const { t } = useTranslation('admin');
  const { t: tToast } = useTranslation('toast');
  const weekdays = t('settings.weekdays', { returnObjects: true }) as string[];
  const bh = form.businessHours || DEFAULT_BUSINESS_HOURS;
  const holidays = form.holidays || [];
  const holidayNames = form.holidayNames || {};
  const [fetching, setFetching] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [holidayConfirm, setHolidayConfirm] = useState<{ date: string; count: number } | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  function updateDay(dow: string, patch: Partial<DaySchedule>) {
    update({ businessHours: { ...bh, [dow]: { ...bh[dow], ...patch } } });
  }

  function setWeekendClosed() {
    update({ businessHours: { ...bh, '0': { ...bh['0'], open: false }, '6': { ...bh['6'], open: false } } });
  }
  function setWeekendOpen() {
    update({ businessHours: { ...bh, '0': { ...bh['0'], open: true, amOpen: true, pmOpen: true }, '6': { ...bh['6'], open: true, amOpen: true, pmOpen: true } } });
  }

  /** 時刻文字列→0〜24の数値（タイムラインバー用） */
  function timeToHour(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h + (m || 0) / 60;
  }

  function fmt(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  async function checkReservationsForDate(dateStr: string): Promise<number> {
    const q = query(collection(db, 'reservations'), where('date', '==', dateStr), where('status', 'in', ['confirmed', 'pending']));
    return (await getDocs(q)).size;
  }

  async function toggleHoliday(dateStr: string) {
    if (holidays.includes(dateStr)) {
      const names = { ...holidayNames }; delete names[dateStr];
      update({ holidays: holidays.filter(h => h !== dateStr), holidayNames: names });
    } else {
      const count = await checkReservationsForDate(dateStr);
      if (count > 0) setHolidayConfirm({ date: dateStr, count });
      else update({ holidays: [...holidays, dateStr].sort() });
    }
  }

  function confirmHoliday() {
    if (!holidayConfirm) return;
    update({ holidays: [...holidays, holidayConfirm.date].sort() });
    setHolidayConfirm(null);
  }

  function removeHoliday(d: string) {
    const names = { ...holidayNames }; delete names[d];
    update({ holidays: holidays.filter(h => h !== d), holidayNames: names });
  }

  async function fetchJapaneseHolidays() {
    setFetching(true);
    try {
      const year = new Date().getFullYear();
      const results = await Promise.all([
        fetch(`https://holidays-jp.github.io/api/v1/${year}/date.json`).then(r => r.json()),
        fetch(`https://holidays-jp.github.io/api/v1/${year + 1}/date.json`).then(r => r.json()),
      ]);
      const merged: Record<string, string> = { ...results[0], ...results[1] };
      const newDates = Object.keys(merged).filter(d => !holidays.includes(d));
      update({ holidays: [...new Set([...holidays, ...Object.keys(merged)])].sort(), holidayNames: { ...holidayNames, ...merged } });
      if (newDates.length > 0) showToast(tToast('holidaysAdded', { count: newDates.length }), 'success');
    } catch { /* 無視 */ } finally { setFetching(false); }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1);
  }

  const todayStr = useMemo(() => { const d = new Date(); return fmt(d.getFullYear(), d.getMonth(), d.getDate()); }, []);
  const calendarDays = useMemo(() => {
    const startDow = new Date(viewYear, viewMonth, 1).getDay();
    const dim = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ date: string; day: number; dow: number; isToday: boolean; isHoliday: boolean } | null> = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) {
      const dateStr = fmt(viewYear, viewMonth, d);
      cells.push({ date: dateStr, day: d, dow: new Date(viewYear, viewMonth, d).getDay(), isToday: dateStr === todayStr, isHoliday: holidays.includes(dateStr) });
    }
    return cells;
  }, [viewYear, viewMonth, holidays, todayStr]);

  /** 営業日数/休診日数サマリー */
  const openDays = weekdays.filter((_, i) => bh[String(i)]?.open).length;

  return (
    <div className="space-y-4">
      {/* ── メインレイアウト: 左カレンダー + 右タイムライン ── */}
      <div className="relative">
        {/* 左: 月カレンダー + 休日リスト（absolute → 右カラムが高さを決定） */}
        <div className="absolute top-0 bottom-0 left-0 w-[17rem] flex flex-col gap-4 overflow-hidden">
          <Card>
            <CardBody className="pb-3">
              {/* カレンダーヘッダー */}
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={prevMonth} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-cream-100 text-navy-400 hover:text-navy-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-sm font-heading font-semibold text-navy-700">{viewYear}年{viewMonth + 1}月</span>
                <button type="button" onClick={nextMonth} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-cream-100 text-navy-400 hover:text-navy-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 mb-1">
                {weekdays.map((wd, i) => (
                  <div key={wd} className={cn('text-center text-[10px] py-1 font-semibold', i === 0 && 'text-red-400', i === 6 && 'text-sky-400', i > 0 && i < 6 && 'text-navy-300')}>{wd}</div>
                ))}
              </div>
              {/* 日付グリッド */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((cell, i) => {
                  if (!cell) return <div key={`e-${i}`} className="h-8" />;
                  return (
                    <button key={cell.date} type="button" onClick={() => toggleHoliday(cell.date)}
                      title={cell.isHoliday ? t('settings.businessDays.clickToRemove') : t('settings.businessDays.clickToSetHoliday')}
                      className={cn(
                        'relative h-8 flex items-center justify-center text-xs rounded-md transition-all',
                        cell.isHoliday ? 'bg-red-500 text-white font-bold shadow-sm hover:bg-red-600 scale-105' : 'hover:bg-cream-100 hover:scale-105',
                        !cell.isHoliday && cell.isToday && 'ring-2 ring-gold/40 font-bold text-gold',
                        !cell.isHoliday && cell.dow === 0 && 'text-red-400',
                        !cell.isHoliday && cell.dow === 6 && 'text-sky-400',
                        !cell.isHoliday && cell.dow > 0 && cell.dow < 6 && 'text-navy-600',
                      )}
                    >
                      {cell.day}
                      {cell.isHoliday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/80" />}
                    </button>
                  );
                })}
              </div>
              {/* アクションバー */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-cream-200">
                <Button size="sm" onClick={fetchJapaneseHolidays} loading={fetching} className="text-[11px]">{t('settings.businessDays.fetchHolidays')}</Button>
                {holidays.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => update({ holidays: [], holidayNames: {} })} className="text-[11px]">{t('settings.businessDays.clearHolidays')}</Button>
                )}
              </div>
            </CardBody>
          </Card>

          {/* 休日リスト（右カラム底辺に揃える） */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-navy-400 uppercase tracking-wider">{t('settings.businessDays.holidays')}</h4>
                <span className="text-xs tabular-nums px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">{holidays.length}{t('settings.businessDays.daysUnit')}</span>
              </div>
            </CardHeader>
            <CardBody className="pt-0 flex-1 flex flex-col min-h-0">
              {holidays.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-6 text-navy-300">
                  <svg className="w-7 h-7 mb-1.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                  <p className="text-[11px]">{t('settings.businessDays.calendarClickHint')}</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
                  {holidays.map(d => {
                    const dt = new Date(d + 'T00:00:00');
                    const dow = weekdays[dt.getDay()];
                    return (
                      <div key={d} className="flex items-center gap-1.5 py-1 px-1.5 text-xs rounded group hover:bg-cream-50 transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        <span className="text-navy-600 tabular-nums">{d.replace(/-/g, '/')}（{dow}）</span>
                        {holidayNames[d] && <span className="text-gold text-[10px] font-medium truncate">{holidayNames[d]}</span>}
                        <button type="button" onClick={() => removeHoliday(d)} className="ml-auto text-navy-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" aria-label="削除">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* 右: 締切設定 + 週間タイムライン（通常フローで高さを決定） */}
        <div className="ml-[calc(17rem+1rem)] space-y-4">
          {/* 予約・キャンセル締切 */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-medium text-navy-700">{t('settings.businessDays.timeline.bookingCutoff')}</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-navy-400 mb-1.5">{t('settings.businessDays.timeline.bookingCutoffLabel')}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-navy-400">{t('settings.businessDays.timeline.before')}</span>
                    <input type="number" min={0} value={form.bookingCutoffMinutes ?? 0} onChange={e => update({ bookingCutoffMinutes: Number(e.target.value) })} className="w-20 rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-navy-700 text-center focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                    <span className="text-xs text-navy-400">{t('settings.businessDays.timeline.minutesBefore')}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1.5">{t('settings.businessDays.timeline.cancelCutoffLabel')}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-navy-400">{t('settings.businessDays.timeline.before')}</span>
                    <input type="number" min={0} value={form.cancelCutoffMinutes ?? 60} onChange={e => update({ cancelCutoffMinutes: Number(e.target.value) })} className="w-20 rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-navy-700 text-center focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                    <span className="text-xs text-navy-400">{t('settings.businessDays.timeline.minutesBefore')}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 週間スケジュール */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-navy-700">{t('settings.businessDays.weeklySchedule')}</h3>
                  <p className="text-[11px] text-navy-400 mt-0.5">
                    {t('settings.businessDays.openDays')} <span className="font-semibold text-navy-600">{openDays}{t('settings.businessDays.daysUnitJa')}</span> / {t('settings.businessDays.closedDays')} <span className="font-semibold text-red-400">{7 - openDays}{t('settings.businessDays.daysUnitJa')}</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={setWeekendClosed} className="px-2.5 py-1 text-[11px] rounded-full border border-cream-300 text-navy-500 hover:bg-cream-100 transition-colors">{t('settings.businessDays.weekendClosed')}</button>
                  <button type="button" onClick={setWeekendOpen} className="px-2.5 py-1 text-[11px] rounded-full border border-cream-300 text-navy-500 hover:bg-cream-100 transition-colors">{t('settings.businessDays.weekendOpen')}</button>
                </div>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              {/* タイムライン目盛り */}
              <div className="ml-10 flex justify-between text-[9px] text-navy-300 mb-1 px-0.5">
                {[6, 8, 10, 12, 14, 16, 18, 20, 22].map(h => (
                  <span key={h} className="tabular-nums">{h}:00</span>
                ))}
              </div>

              <div className="space-y-1">
                {weekdays.map((label, i) => {
                  const dow = String(i);
                  const day = bh[dow] || { open: false, amOpen: false, amStart: '9:00', amEnd: '12:00', pmOpen: false, pmStart: '14:00', pmEnd: '19:00' };
                  const isExpanded = expandedDay === dow;
                  const TL_START = 6; const TL_SPAN = 16;
                  const amLeft = day.open && day.amOpen ? ((timeToHour(day.amStart) - TL_START) / TL_SPAN) * 100 : 0;
                  const amWidth = day.open && day.amOpen ? ((timeToHour(day.amEnd) - timeToHour(day.amStart)) / TL_SPAN) * 100 : 0;
                  const pmLeft = day.open && day.pmOpen ? ((timeToHour(day.pmStart) - TL_START) / TL_SPAN) * 100 : 0;
                  const pmWidth = day.open && day.pmOpen ? ((timeToHour(day.pmEnd) - timeToHour(day.pmStart)) / TL_SPAN) * 100 : 0;

                  return (
                    <div key={dow}>
                      <button type="button" onClick={() => setExpandedDay(isExpanded ? null : dow)}
                        className={cn('w-full flex items-center gap-2 py-2 px-1 rounded-lg transition-all hover:bg-cream-50', isExpanded && 'bg-cream-50')}>
                        <div className="w-8 shrink-0 flex flex-col items-center gap-0.5">
                          <span className={cn('text-xs font-bold leading-none', i === 0 && 'text-red-500', i === 6 && 'text-sky-500', i > 0 && i < 6 && 'text-navy-600')}>{label}</span>
                          <span className={cn('text-[9px] font-medium', day.open ? 'text-emerald-500' : 'text-navy-300')}>{day.open ? t('settings.businessDays.dayStatus.open') : t('settings.businessDays.dayStatus.closed')}</span>
                        </div>
                        <div className="flex-1 relative h-6 bg-cream-100 rounded-full overflow-hidden">
                          {day.open ? (
                            <>
                              {day.amOpen && amWidth > 0 && (
                                <div className="absolute top-0.5 bottom-0.5 bg-gradient-to-r from-sky-400 to-sky-300 rounded-full" style={{ left: `${Math.max(0, amLeft)}%`, width: `${amWidth}%` }}>
                                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white drop-shadow-sm">{amWidth > 6 ? `${day.amStart}–${day.amEnd}` : t('settings.businessDays.dayStatus.timelineMorning')}</span>
                                </div>
                              )}
                              {day.pmOpen && pmWidth > 0 && (
                                <div className="absolute top-0.5 bottom-0.5 bg-gradient-to-r from-gold to-amber-400 rounded-full" style={{ left: `${Math.max(0, pmLeft)}%`, width: `${pmWidth}%` }}>
                                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white drop-shadow-sm">{pmWidth > 6 ? `${day.pmStart}–${day.pmEnd}` : '午後'}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] text-navy-300 tracking-widest">{t('settings.businessDays.dayStatus.closedDay')}</span></div>
                          )}
                        </div>
                        <svg className={cn('w-3.5 h-3.5 text-navy-300 transition-transform shrink-0', isExpanded && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>

                      {isExpanded && (
                        <div className="ml-10 mr-6 mb-2 p-3 bg-white rounded-lg border border-cream-200 shadow-sm animate-fade-in-up space-y-3">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <div className={cn('relative w-9 h-5 rounded-full transition-colors', day.open ? 'bg-emerald-400' : 'bg-navy-200')}>
                              <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', day.open ? 'left-[18px]' : 'left-0.5')} />
                              <input type="checkbox" checked={day.open} onChange={e => updateDay(dow, { open: e.target.checked })} className="sr-only" />
                            </div>
                            <span className="text-sm text-navy-600 font-medium">{day.open ? t('settings.businessDays.dayStatus.openDay') : t('settings.businessDays.dayStatus.closedDay')}</span>
                          </label>
                          {day.open && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className={cn('rounded-lg p-2.5 border transition-colors', day.amOpen ? 'border-sky-200 bg-sky-50/50' : 'border-cream-200 bg-cream-50 opacity-60')}>
                                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                                  <input type="checkbox" checked={day.amOpen} onChange={e => updateDay(dow, { amOpen: e.target.checked })} className="rounded text-sky-400" />
                                  <span className="text-xs font-semibold text-sky-600">{t('settings.businessDays.dayStatus.morning')}</span>
                                </label>
                                {day.amOpen && (
                                  <>
                                    <div className="flex items-center gap-1.5">
                                      <select value={day.amStart} onChange={e => updateDay(dow, { amStart: e.target.value })} className="flex-1 px-2 py-1.5 border border-sky-200 rounded-md text-xs bg-white focus:ring-1 focus:ring-sky-300 focus:border-sky-300">
                                        {AM_TIMES.map(time => <option key={time} value={time}>{time}</option>)}
                                      </select>
                                      <span className="text-navy-400 text-xs">〜</span>
                                      <select value={day.amEnd} onChange={e => updateDay(dow, { amEnd: e.target.value })} className="flex-1 px-2 py-1.5 border border-sky-200 rounded-md text-xs bg-white focus:ring-1 focus:ring-sky-300 focus:border-sky-300">
                                        {AM_TIMES.map(time => <option key={time} value={time}>{time}</option>)}
                                      </select>
                                    </div>
                                    {timeToMinutes(day.amStart) >= timeToMinutes(day.amEnd) && <p className="text-[10px] text-red-500 font-medium mt-1">{t('settings.businessDays.dayStatus.timeRangeError')}</p>}
                                  </>
                                )}
                              </div>
                              <div className={cn('rounded-lg p-2.5 border transition-colors', day.pmOpen ? 'border-amber-200 bg-amber-50/50' : 'border-cream-200 bg-cream-50 opacity-60')}>
                                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                                  <input type="checkbox" checked={day.pmOpen} onChange={e => updateDay(dow, { pmOpen: e.target.checked })} className="rounded text-amber-400" />
                                  <span className="text-xs font-semibold text-amber-600">{t('settings.businessDays.dayStatus.afternoon')}</span>
                                </label>
                                {day.pmOpen && (
                                  <>
                                    <div className="flex items-center gap-1.5">
                                      <select value={day.pmStart} onChange={e => updateDay(dow, { pmStart: e.target.value })} className="flex-1 px-2 py-1.5 border border-amber-200 rounded-md text-xs bg-white focus:ring-1 focus:ring-amber-300 focus:border-amber-300">
                                        {PM_TIMES.map(time => <option key={time} value={time}>{time}</option>)}
                                      </select>
                                      <span className="text-navy-400 text-xs">〜</span>
                                      <select value={day.pmEnd} onChange={e => updateDay(dow, { pmEnd: e.target.value })} className="flex-1 px-2 py-1.5 border border-amber-200 rounded-md text-xs bg-white focus:ring-1 focus:ring-amber-300 focus:border-amber-300">
                                        {PM_TIMES.map(time => <option key={time} value={time}>{time}</option>)}
                                      </select>
                                    </div>
                                    {timeToMinutes(day.pmStart) >= timeToMinutes(day.pmEnd) && <p className="text-[10px] text-red-500 font-medium mt-1">{t('settings.businessDays.dayStatus.timeRangeError')}</p>}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!holidayConfirm}
        title={t('settings.businessDays.confirmHoliday.title')}
        message={t('settings.businessDays.confirmHoliday.message', { date: holidayConfirm?.date, count: holidayConfirm?.count })}
        okLabel={t('settings.businessDays.confirmHoliday.okLabel')}
        variant="danger"
        onConfirm={confirmHoliday}
        onCancel={() => setHolidayConfirm(null)}
      />
    </div>
  );
}

/* ── お知らせタブ（ラベル明確化 + 日時逆転チェック） ── */
function AnnouncementTab({ form, update, showToast }: { form: Partial<ClinicSettings>; update: (p: Partial<ClinicSettings>) => void; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const { t } = useTranslation('admin');
  const ann = form.announcement || { active: false, type: 'info' as const, message: '', startDate: null, endDate: null };
  const maint = form.maintenance || { startDate: null, endDate: null };

  /** 日時逆転チェック */
  function validateDateRange(start: string | null, end: string | null, label: string): boolean {
    if (start && end && start > end) {
      showToast(`${label}の開始日時が終了日時より後になっています`, 'error');
      return false;
    }
    return true;
  }

  function updateAnn(patch: Partial<typeof ann>) {
    const next = { ...ann, ...patch };
    if ('startDate' in patch || 'endDate' in patch) {
      validateDateRange(next.startDate, next.endDate, 'お知らせ表示');
    }
    update({ announcement: next });
  }
  function updateMaint(patch: Partial<typeof maint>) {
    const next = { ...maint, ...patch };
    if ('startDate' in patch || 'endDate' in patch) {
      validateDateRange(next.startDate, next.endDate, 'メンテナンス');
    }
    update({ maintenance: next });
  }

  function clearAnn() {
    update({ announcement: { active: false, type: 'info', message: '', startDate: null, endDate: null } });
  }
  function clearMaint() {
    update({ maintenance: { startDate: null, endDate: null } });
  }

  const hasAnnData = ann.active || ann.message || ann.startDate || ann.endDate;
  const hasMaintData = maint.startDate || maint.endDate;

  /** 日時逆転警告表示 */
  const annDateError = ann.startDate && ann.endDate && ann.startDate > ann.endDate;
  const maintDateError = maint.startDate && maint.endDate && maint.startDate > maint.endDate;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-navy-700">{t('settings.announcement.bannerTitle')}</h3>
            {hasAnnData && (
              <Button size="sm" variant="ghost" onClick={clearAnn}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                {t('settings.announcement.clear')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div className={cn('relative w-9 h-5 rounded-full transition-colors', ann.active ? 'bg-emerald-400' : 'bg-navy-200')}>
              <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', ann.active ? 'left-[18px]' : 'left-0.5')} />
              <input type="checkbox" checked={ann.active} onChange={e => updateAnn({ active: e.target.checked })} className="sr-only" />
            </div>
            <span className="text-sm text-navy-600 font-medium">{ann.active ? t('settings.announcement.active') : t('settings.announcement.inactive')}</span>
          </label>
          {ann.active && (
            <>
              <Select label={t('settings.announcement.typeLabel')} value={ann.type} onChange={e => updateAnn({ type: e.target.value as 'info' | 'warning' | 'maintenance' })} options={[
                { value: 'info', label: t('settings.announcement.typeInfo') },
                { value: 'warning', label: t('settings.announcement.typeWarning') },
                { value: 'maintenance', label: t('settings.announcement.typeMaintenance') },
              ]} />
              <Textarea label={t('settings.announcement.messageLabel')} value={ann.message} onChange={e => updateAnn({ message: e.target.value })} rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('settings.announcement.startDateLabel')} type="datetime-local" value={ann.startDate || ''} onChange={e => updateAnn({ startDate: e.target.value || null })} />
                <Input label={t('settings.announcement.endDateLabel')} type="datetime-local" value={ann.endDate || ''} onChange={e => updateAnn({ endDate: e.target.value || null })} />
              </div>
              {annDateError && (
                <Alert variant="warning">{t('settings.announcement.dateRangeError')}</Alert>
              )}
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-navy-700">{t('settings.announcement.maintenanceTitle')}</h3>
            {hasMaintData && (
              <Button size="sm" variant="ghost" onClick={clearMaint}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                {t('settings.announcement.clear')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <Alert variant="warning">{t('settings.announcement.maintenanceWarning')}</Alert>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('settings.announcement.maintenanceStartLabel')} type="datetime-local" value={maint.startDate || ''} onChange={e => updateMaint({ startDate: e.target.value || null })} />
            <Input label={t('settings.announcement.maintenanceEndLabel')} type="datetime-local" value={maint.endDate || ''} onChange={e => updateMaint({ endDate: e.target.value || null })} />
          </div>
          {maintDateError && (
            <Alert variant="warning">{t('settings.announcement.dateRangeError')}</Alert>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ── 利用規約タブ（C2） ── */
function TermsTab({ form, update }: { form: Partial<ClinicSettings>; update: (p: Partial<ClinicSettings>) => void }) {
  const { t } = useTranslation('admin');
  const { t: tToast } = useTranslation('toast');
  const { showToast } = useToast();
  const [termsVersion, setTermsVersion] = useState('');
  const [termsUpdatedAt, setTermsUpdatedAt] = useState('');
  const [bumping, setBumping] = useState(false);

  // settings/terms からバージョン情報取得
  useEffect(() => {
    getDoc(doc(db, 'settings', 'terms')).then(snap => {
      if (snap.exists()) {
        setTermsVersion(snap.data().currentVersion || '1.0');
        setTermsUpdatedAt(snap.data().updatedAt || '');
      } else {
        setTermsVersion('1.0');
      }
    }).catch(() => {});
  }, []);

  /** バージョン更新（全管理者に再同意を要求） */
  async function handleBumpVersion() {
    const parts = termsVersion.split('.');
    const minor = parseInt(parts[1] || '0', 10) + 1;
    const newVer = `${parts[0]}.${minor}`;
    setBumping(true);
    try {
      await setDoc(doc(db, 'settings', 'terms'), {
        currentVersion: newVer,
        updatedAt: new Date().toISOString(),
      });
      setTermsVersion(newVer);
      setTermsUpdatedAt(new Date().toISOString());
      showToast(tToast('termsVersionUpdated', { version: newVer }), 'success');
    } catch {
      showToast(tToast('termsVersionUpdateFailed'), 'error');
    } finally {
      setBumping(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-navy-700">{t('settings.terms.title')}</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-navy-400 tabular-nums">
                v{termsVersion}
                {termsUpdatedAt && ` (${new Date(termsUpdatedAt).toLocaleDateString('ja-JP')} ${t('settings.terms.versionUpdated')})`}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Textarea
            label={t('settings.terms.termsTextLabel')}
            value={form.termsOfService || ''}
            onChange={e => update({ termsOfService: e.target.value })}
            rows={20}
            placeholder={t('settings.terms.termsTextPlaceholder')}
          />
          <p className="text-[11px] text-navy-400">
            {t('settings.terms.termsHint')}
          </p>
        </CardBody>
      </Card>

    </div>
  );
}

/* ── ポリシータブ（PP + 要配慮個人情報同意文言） ── */
function PolicyTab({ form, update }: { form: Partial<ClinicSettings>; update: (p: Partial<ClinicSettings>) => void }) {
  const { t } = useTranslation('admin');
  const name = form.clinicName || '〇〇クリニック';
  const phone = form.phone || '000-0000-0000';

  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  /** テンプレートテキストを生成 */
  function generateTexts() {
    return {
      privacyPolicy: `プライバシーポリシー\n\n${name}（以下「当院」）は、患者様の個人情報の保護に努め、個人情報の保護に関する法律（個人情報保護法）を遵守いたします。\n\n【収集する情報】\nお名前、ふりがな、生年月日、住所、電話番号、メールアドレス、症状・お悩み（要配慮個人情報）、保険証情報\n\n【利用目的】\n1. 予約の受付・確認・変更・キャンセル処理\n2. 診療準備のための症状・お悩みの事前把握\n3. 予約確認・リマインダー等のご連絡\n4. 再来院時の前回情報参照\n5. サービス改善のための匿名化統計分析\n\n【第三者提供】\nご本人の同意なく、個人情報を第三者に提供することはありません。ただし、法令に基づく場合を除きます。\n\n【要配慮個人情報の取り扱い】\n症状・お悩み等の健康に関する情報は「要配慮個人情報」として、ご本人の明示的な同意を得た上で取得・利用いたします。\n\n【データの保存期間】\nお預かりした個人情報は、利用目的の達成後、当院が定める保存期間を経て安全に削除いたします。\n\n【開示・訂正・利用停止】\nご自身の個人情報の開示・訂正・利用停止をご希望の場合は、下記の窓口までご連絡ください。本人確認の上、法令に基づき対応いたします。\n\n【お問い合わせ窓口】\n${name} 個人情報相談窓口\n電話: ${phone}`,
      sensitiveDataConsentText: `「症状・お悩み」欄に入力される健康に関する情報は、個人情報保護法上の「要配慮個人情報」に該当する可能性があります。${name}の予約対応・施術準備の目的でのみ使用し、ご本人の同意なく第三者に提供することはありません。`,
      dataRetentionPurpose: `${name}は、ご予約時にご提供いただく個人情報を、以下の目的で利用いたします。\n\n1. 予約の受付・確認・変更・キャンセル処理\n2. 診療準備のための症状・お悩みの事前把握\n3. 予約確認・リマインダー等のご連絡\n4. 再来院時の前回情報参照\n5. サービス改善のための匿名化統計分析\n\n上記目的の達成後、所定の保存期間を経て安全に削除いたします。`,
      patientRightsContact: `個人情報の開示・訂正・利用停止をご希望の場合は、下記までご連絡ください。\n\n窓口: ${name} 個人情報相談窓口\n電話: ${phone}\n\n本人確認の上、法令に基づき対応いたします。`,
    };
  }

  /** 未入力フィールドのみ自動生成 */
  function autoFillDefaults() {
    const texts = generateTexts();
    const patch: Partial<ClinicSettings> = {};
    if (!form.privacyPolicy?.trim()) patch.privacyPolicy = texts.privacyPolicy;
    if (!form.sensitiveDataConsentText?.trim()) patch.sensitiveDataConsentText = texts.sensitiveDataConsentText;
    if (!form.dataRetentionPurpose?.trim()) patch.dataRetentionPurpose = texts.dataRetentionPurpose;
    if (!form.patientRightsContact?.trim()) patch.patientRightsContact = texts.patientRightsContact;
    if (Object.keys(patch).length > 0) update(patch);
  }

  /** 全フィールドを上書き再生成 */
  function regenerateAll() {
    update(generateTexts());
    setConfirmRegenerate(false);
  }

  const hasEmpty = !form.privacyPolicy?.trim() || !form.sensitiveDataConsentText?.trim() || !form.dataRetentionPurpose?.trim() || !form.patientRightsContact?.trim();

  return (
    <div className="space-y-4">
      {hasEmpty ? (
        <Alert variant="info">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">{t('settings.policy.autoFillAlert')}</span>
            <Button size="sm" variant="secondary" onClick={autoFillDefaults} className="shrink-0">
              {t('settings.policy.autoGenerate')}
            </Button>
          </div>
        </Alert>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setConfirmRegenerate(true)}
            className="text-xs text-navy-400 hover:text-navy-600 underline underline-offset-2 transition-colors"
          >
            {t('settings.policy.regenerateLink')}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmRegenerate}
        title={t('settings.policy.regenerateConfirmTitle')}
        message={t('settings.policy.regenerateConfirmMessage')}
        okLabel={t('settings.policy.regenerateOkLabel')}
        cancelLabel={t('settings.policy.cancelLabel')}
        onConfirm={regenerateAll}
        onCancel={() => setConfirmRegenerate(false)}
      />

      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-navy-700">{t('settings.policy.privacyPolicyTitle')}</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          <Textarea
            label={t('settings.policy.privacyPolicyLabel')}
            value={form.privacyPolicy || ''}
            onChange={e => update({ privacyPolicy: e.target.value })}
            rows={12}
            placeholder={'プライバシーポリシー\n\n〇〇クリニック（以下「当院」）は、患者様の個人情報の保護に努め、個人情報の保護に関する法律（個人情報保護法）を遵守いたします。\n\n【収集する情報】\nお名前、ふりがな、生年月日、住所、電話番号、メールアドレス、症状・お悩み（要配慮個人情報）、保険証情報\n\n【利用目的】\n1. 予約の受付・確認・変更・キャンセル処理\n2. 診療準備のための症状・お悩みの事前把握\n3. 予約確認・リマインダー等のご連絡\n4. 再来院時の前回情報参照\n5. サービス改善のための匿名化統計分析\n\n【第三者提供】\nご本人の同意なく、個人情報を第三者に提供することはありません。ただし、法令に基づく場合を除きます。\n\n【要配慮個人情報の取り扱い】\n症状・お悩み等の健康に関する情報は「要配慮個人情報」として、ご本人の明示的な同意を得た上で取得・利用いたします。\n\n【データの保存期間】\nお預かりした個人情報は、利用目的の達成後、当院が定める保存期間を経て安全に削除いたします。\n\n【開示・訂正・利用停止】\nご自身の個人情報の開示・訂正・利用停止をご希望の場合は、下記の窓口までご連絡ください。本人確認の上、法令に基づき対応いたします。\n\n【お問い合わせ窓口】\n〇〇クリニック 個人情報相談窓口\n電話: 000-0000-0000\nメール: privacy@example.com'}
          />
          <p className="text-[11px] text-navy-400">
            {t('settings.policy.privacyPolicyHint')}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-navy-700">{t('settings.policy.sensitiveDataTitle')}</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          <Textarea
            label={t('settings.policy.sensitiveDataLabel')}
            value={form.sensitiveDataConsentText || ''}
            onChange={e => update({ sensitiveDataConsentText: e.target.value.slice(0, 500) })}
            rows={4}
            placeholder={t('settings.policy.sensitiveDataPlaceholder')}
          />
          <p className="text-[11px] text-navy-400">
            {t('settings.policy.sensitiveDataHint')}
            {form.sensitiveDataConsentText ? t('settings.policy.sensitiveDataCharCount', { count: form.sensitiveDataConsentText.length }) : ''}
          </p>
        </CardBody>
      </Card>

      {/* [H1] データ保存期間ポリシー */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-navy-700">{t('settings.policy.dataRetentionTitle')}</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-navy-600">{t('settings.policy.dataRetentionLabel')}</label>
            <select
              value={form.dataRetentionMonths ?? 0}
              onChange={e => update({ dataRetentionMonths: Number(e.target.value) })}
              className="rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-navy-700 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
            >
              <option value={0}>{t('settings.policy.retentionUnlimited')}</option>
              <option value={6}>{t('settings.policy.retention6months')}</option>
              <option value={12}>{t('settings.policy.retention1year')}</option>
              <option value={24}>{t('settings.policy.retention2years')}</option>
              <option value={36}>{t('settings.policy.retention3years')}</option>
              <option value={60}>{t('settings.policy.retention5years')}</option>
            </select>
          </div>
          <Textarea
            label={t('settings.policy.usagePurposeLabel')}
            value={form.dataRetentionPurpose || ''}
            onChange={e => update({ dataRetentionPurpose: e.target.value })}
            rows={5}
            placeholder={'当院は、ご予約時にご提供いただく個人情報を、以下の目的で利用いたします。\n\n1. 予約の受付・確認・変更・キャンセル処理\n2. 診療準備のための症状・お悩みの事前把握\n3. 予約確認・リマインダー等のご連絡\n4. 再来院時の前回情報参照\n5. サービス改善のための匿名化統計分析\n\n上記目的の達成後、所定の保存期間を経て安全に削除いたします。'}
          />
          <p className="text-[11px] text-navy-400">
            {t('settings.policy.usagePurposeHint')}
          </p>
          <Alert variant="info">
            {t('settings.policy.retentionLegalNote')}
          </Alert>
        </CardBody>
      </Card>

      {/* [H2] リマインダーメール配信設定 */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-navy-700">{t('settings.policy.reminderEmailTitle')}</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div className={cn('relative w-9 h-5 rounded-full transition-colors', form.reminderEmailEnabled ? 'bg-emerald-400' : 'bg-navy-200')}>
              <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', form.reminderEmailEnabled ? 'left-[18px]' : 'left-0.5')} />
              <input type="checkbox" checked={form.reminderEmailEnabled || false} onChange={e => update({ reminderEmailEnabled: e.target.checked })} className="sr-only" />
            </div>
            <span className="text-sm text-navy-600 font-medium">{t('settings.policy.reminderEmailLabel')}</span>
          </label>
          <p className="text-[11px] text-navy-400">
            {t('settings.policy.reminderEmailHint')}
          </p>
        </CardBody>
      </Card>

      {/* [H3] 患者権利行使（開示・訂正・利用停止） */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-navy-700">{t('settings.policy.patientRightsTitle')}</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          <Textarea
            label={t('settings.policy.patientRightsLabel')}
            value={form.patientRightsContact || ''}
            onChange={e => update({ patientRightsContact: e.target.value })}
            rows={4}
            placeholder={'個人情報の開示・訂正・利用停止をご希望の場合は、下記までご連絡ください。\n\n窓口: 〇〇クリニック 個人情報相談窓口\n電話: 000-0000-0000\nメール: privacy@example.com\n\n本人確認の上、法令に基づき対応いたします。'}
          />
          <p className="text-[11px] text-navy-400">
            {t('settings.policy.patientRightsHint')}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

/* ── アカウントタブ ── */
function AccountsTab({ adminUsers }: { adminUsers: ReturnType<typeof useAdminUsers> }) {
  const { t } = useTranslation('admin');
  const { t: tToast } = useTranslation('toast');
  const { users, loading, fetchUsers } = adminUsers;
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ uid: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const MAX_ADMIN_USERS = 2;

  async function handleCreate() {
    if (users.length >= MAX_ADMIN_USERS) {
      showToast(tToast('maxUsersReached', { max: MAX_ADMIN_USERS }), 'error');
      return;
    }
    if (!email || !password) { showToast(tToast('emailPasswordRequired'), 'error'); return; }
    if (!isValidEmail(toHankaku(email))) { showToast(tToast('invalidEmail'), 'error'); return; }
    const check = isStrongPassword(password);
    if (!check.valid) { showToast(check.reason!, 'error'); return; }
    setCreating(true);
    try {
      await createAdminUser(toHankaku(email), password);
      showToast(tToast('userCreated'), 'success');
      setEmail('');
      setPassword('');
      await fetchUsers();
    } catch {
      showToast(tToast('userCreateFailed'), 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminUser(deleteTarget.uid);
      showToast(tToast('userDeleted'), 'success');
      await fetchUsers();
    } catch {
      showToast(tToast('userDeleteFailed'), 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><h3 className="text-sm font-medium text-navy-700">{t('settings.accounts.createUserTitle')}</h3></CardHeader>
        <CardBody className="space-y-3">
          {users.length >= MAX_ADMIN_USERS && (
            <Alert variant="warning">{t('settings.accounts.maxUsersWarning', { max: MAX_ADMIN_USERS })}</Alert>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={t('settings.accounts.emailLabel')} type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={users.length >= MAX_ADMIN_USERS} placeholder={t('settings.accounts.emailPlaceholder')} />
            <div>
              <PasswordInput label={t('settings.accounts.passwordLabel')} value={password} onChange={e => setPassword(e.target.value)} disabled={users.length >= MAX_ADMIN_USERS} placeholder={t('settings.accounts.passwordPlaceholder')} />
              <p className="text-[11px] text-navy-400 mt-1.5">{t('settings.accounts.passwordHint')}</p>
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={handleCreate} loading={creating} disabled={users.length >= MAX_ADMIN_USERS}>{t('settings.accounts.createButton')}</Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="text-sm font-medium text-navy-700">{t('settings.accounts.userListTitle')}</h3></CardHeader>
        <CardBody>
          {loading ? <Spinner className="py-4" /> : users.length === 0 ? (
            <p className="text-sm text-navy-400 py-4 text-center">{t('settings.accounts.noUsers')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left">
                  <th className="px-3 py-2 text-xs text-navy-400">{t('settings.accounts.tableEmail')}</th>
                  <th className="px-3 py-2 text-xs text-navy-400">{t('settings.accounts.tableCreatedAt')}</th>
                  <th className="px-3 py-2 text-xs text-navy-400">{t('settings.accounts.tableActions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid} className="border-b border-cream-200">
                    <td className="px-3 py-2 text-navy-700">{maskEmail(u.email)}</td>
                    <td className="px-3 py-2 text-navy-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('ja-JP') : '-'}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(u)}>{t('settings.accounts.deleteButton')}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('settings.accounts.deleteConfirmTitle')}
        message={t('settings.accounts.deleteConfirmMessage', { email: deleteTarget?.email })}
        okLabel={t('settings.accounts.deleteOkLabel')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
