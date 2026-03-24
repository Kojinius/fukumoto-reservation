import { useState, useEffect, useMemo, useRef } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
import { isStrongPassword } from '@/utils/validation';
import { toHankaku } from '@/utils/security';
import { cn } from '@/utils/cn';
import type { ClinicSettings, DaySchedule } from '@/types/clinic';
import { DEFAULT_BUSINESS_HOURS } from '@/types/clinic';

const TABS = ['基本情報', '営業時間', '休日', 'お知らせ', '利用規約', 'アカウント'] as const;
type Tab = typeof TABS[number];
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function Settings() {
  const { clinic, loading: clinicLoading } = useClinic();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('基本情報');
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
    if (!form.clinicName?.trim()) { showToast('院名は必須です', 'error'); return; }
    if (!form.phone?.trim()) { showToast('電話番号は必須です', 'error'); return; }
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'clinic'), {
        ...form,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      showToast('設定を保存しました', 'success');
    } catch {
      showToast('保存に失敗しました', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (clinicLoading) return <Spinner className="py-12" />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold text-navy-700">設定</h2>
        <Button onClick={handleSave} loading={saving}>保存</Button>
      </div>

      {/* タブ */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <Button key={t} size="sm" variant={tab === t ? 'primary' : 'ghost'} onClick={() => setTab(t)}>
            {t}
          </Button>
        ))}
      </div>

      {/* 基本情報 */}
      {tab === '基本情報' && <BasicInfoTab form={form} update={update} />}

      {/* 営業時間 */}
      {tab === '営業時間' && <BusinessHoursTab form={form} update={update} />}

      {/* 休日 */}
      {tab === '休日' && <HolidaysTab form={form} update={update} />}

      {/* お知らせ */}
      {tab === 'お知らせ' && <AnnouncementTab form={form} update={update} />}

      {/* 利用規約 */}
      {tab === '利用規約' && <TermsTab form={form} update={update} />}

      {/* アカウント */}
      {tab === 'アカウント' && <AccountsTab adminUsers={adminUsers} />}
    </div>
  );
}

/* ── 基本情報タブ ── */
function BasicInfoTab({ form, update }: { form: Partial<ClinicSettings>; update: (p: Partial<ClinicSettings>) => void }) {
  const [zipMsg, setZipMsg] = useState('');
  const updateRef = useRef(update);
  updateRef.current = update;

  /* 郵便番号自動検索（CVCreator方式） */
  useEffect(() => {
    const digits = (form.clinicZip || '').replace(/[^\d]/g, '');
    if (digits.length !== 7) { setZipMsg(''); return; }
    setZipMsg('検索中…');
    const timer = setTimeout(async () => {
      try {
        const addr = await lookupZip(digits);
        if (addr) {
          updateRef.current({ clinicAddress: addr });
          setZipMsg('✓ 住所を反映');
        } else {
          setZipMsg('見つかりません');
        }
      } catch {
        setZipMsg('検索エラー');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.clinicZip]);

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_12rem] gap-4">
          <Input label="院名 *" value={form.clinicName || ''} onChange={e => update({ clinicName: e.target.value })} />
          <Input label="電話番号 *" value={form.phone || ''} onChange={e => update({ phone: e.target.value })} />
        </div>
        <Input label="WebサイトURL" value={form.clinicUrl || ''} onChange={e => update({ clinicUrl: e.target.value })} />
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs tracking-wider uppercase text-navy-400 font-body mb-1.5">郵便番号</label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-navy-400 font-medium shrink-0">〒</span>
              <input
                value={form.clinicZip || ''}
                onChange={e => {
                  let digits = e.target.value.replace(/[^\d]/g, '');
                  if (digits.length > 7) digits = digits.slice(0, 7);
                  const formatted = digits.length > 3 ? digits.slice(0, 3) + '-' + digits.slice(3) : digits;
                  update({ clinicZip: formatted });
                }}
                placeholder="123-4567"
                maxLength={8}
                className="w-28 rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm font-body text-navy-700 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all duration-200 hover:border-navy-200"
              />
              {zipMsg && (
                <span className={`text-xs font-bold whitespace-nowrap ${zipMsg.includes('✓') ? 'text-success' : zipMsg.includes('検索中') ? 'text-navy-400' : 'text-danger'}`}>{zipMsg}</span>
              )}
            </div>
          </div>
        </div>
        <Input label="都道府県・市区町村・番地 *" value={form.clinicAddress || ''} onChange={e => update({ clinicAddress: e.target.value })} />
        <Input label="建物名・号室" value={form.clinicAddressSub || ''} onChange={e => update({ clinicAddressSub: e.target.value })} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Input label="予約締切（分前）" type="number" min={0} value={form.bookingCutoffMinutes ?? 0} onChange={e => update({ bookingCutoffMinutes: Number(e.target.value) })} />
          <Input label="キャンセル締切（分前）" type="number" min={0} value={form.cancelCutoffMinutes ?? 60} onChange={e => update({ cancelCutoffMinutes: Number(e.target.value) })} />
        </div>
        <Textarea label="プライバシーポリシー" value={form.privacyPolicy || ''} onChange={e => update({ privacyPolicy: e.target.value })} rows={6} />
        <div>
          <Textarea
            label="要配慮個人情報の同意文言"
            value={form.sensitiveDataConsentText || ''}
            onChange={e => update({ sensitiveDataConsentText: e.target.value.slice(0, 500) })}
            rows={3}
            placeholder="空欄の場合はデフォルト文言が使用されます"
          />
          <p className="text-[11px] text-navy-400 mt-1">予約フォームの症状入力欄に表示されます。{form.sensitiveDataConsentText ? `${form.sensitiveDataConsentText.length}/500文字` : '空欄=デフォルト文言'}</p>
        </div>
      </CardBody>
    </Card>
  );
}

/* ── 営業時間タブ ── */
function BusinessHoursTab({ form, update }: { form: Partial<ClinicSettings>; update: (p: Partial<ClinicSettings>) => void }) {
  const bh = form.businessHours || DEFAULT_BUSINESS_HOURS;

  function updateDay(dow: string, patch: Partial<DaySchedule>) {
    const updated = { ...bh, [dow]: { ...bh[dow], ...patch } };
    update({ businessHours: updated });
  }

  return (
    <Card>
      <CardBody>
        <div className="space-y-3">
          {WEEKDAYS.map((label, i) => {
            const dow = String(i);
            const day = bh[dow] || { open: false, amOpen: false, amStart: '9:00', amEnd: '12:00', pmOpen: false, pmStart: '14:00', pmEnd: '19:00' };
            return (
              <div key={dow} className={cn(
                'flex flex-wrap items-center gap-3 p-3 rounded-lg border',
                day.open ? 'border-cream-300 bg-white' : 'border-cream-200 bg-cream-100 opacity-60',
              )}>
                <label className="flex items-center gap-2 w-12 shrink-0">
                  <input type="checkbox" checked={day.open} onChange={e => updateDay(dow, { open: e.target.checked })} className="rounded text-gold" />
                  <span className={cn('text-sm font-medium', i === 0 && 'text-red-500', i === 6 && 'text-sky-500')}>{label}</span>
                </label>
                {day.open && (
                  <>
                    <div className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={day.amOpen} onChange={e => updateDay(dow, { amOpen: e.target.checked })} className="rounded text-gold" />
                      <span className="text-navy-400">午前</span>
                      <input type="time" value={day.amStart} onChange={e => updateDay(dow, { amStart: e.target.value })} className="px-1 py-0.5 border rounded text-xs bg-white border-cream-300" />
                      <span>〜</span>
                      <input type="time" value={day.amEnd} onChange={e => updateDay(dow, { amEnd: e.target.value })} className="px-1 py-0.5 border rounded text-xs bg-white border-cream-300" />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={day.pmOpen} onChange={e => updateDay(dow, { pmOpen: e.target.checked })} className="rounded text-gold" />
                      <span className="text-navy-400">午後</span>
                      <input type="time" value={day.pmStart} onChange={e => updateDay(dow, { pmStart: e.target.value })} className="px-1 py-0.5 border rounded text-xs bg-white border-cream-300" />
                      <span>〜</span>
                      <input type="time" value={day.pmEnd} onChange={e => updateDay(dow, { pmEnd: e.target.value })} className="px-1 py-0.5 border rounded text-xs bg-white border-cream-300" />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

/* ── 休日タブ（左カレンダー：右リスト） ── */
function HolidaysTab({ form, update }: { form: Partial<ClinicSettings>; update: (p: Partial<ClinicSettings>) => void }) {
  const holidays = form.holidays || [];
  const holidayNames = form.holidayNames || {};
  const [fetching, setFetching] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  function fmt(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const DOW_LABEL = ['日', '月', '火', '水', '木', '金', '土'];

  function toggleHoliday(dateStr: string) {
    if (holidays.includes(dateStr)) {
      const updated = holidays.filter(h => h !== dateStr);
      const names = { ...holidayNames };
      delete names[dateStr];
      update({ holidays: updated, holidayNames: names });
    } else {
      update({ holidays: [...holidays, dateStr].sort() });
    }
  }

  function removeHoliday(d: string) {
    const updated = holidays.filter(h => h !== d);
    const names = { ...holidayNames };
    delete names[d];
    update({ holidays: updated, holidayNames: names });
  }

  function clearAll() {
    update({ holidays: [], holidayNames: {} });
  }

  async function fetchJapaneseHolidays() {
    setFetching(true);
    try {
      const year = new Date().getFullYear();
      const urls = [
        `https://holidays-jp.github.io/api/v1/${year}/date.json`,
        `https://holidays-jp.github.io/api/v1/${year + 1}/date.json`,
      ];
      const results = await Promise.all(urls.map(u => fetch(u).then(r => r.json())));
      const merged: Record<string, string> = { ...results[0], ...results[1] };
      const newHolidays = [...new Set([...holidays, ...Object.keys(merged)])].sort();
      update({ holidays: newHolidays, holidayNames: { ...holidayNames, ...merged } });
    } catch { /* 無視 */ } finally { setFetching(false); }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const todayStr = useMemo(() => { const d = new Date(); return fmt(d.getFullYear(), d.getMonth(), d.getDate()); }, []);

  const days = useMemo(() => {
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

  return (
    <Card>
      <CardBody>
        {/* アクションバー */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button size="sm" onClick={fetchJapaneseHolidays} loading={fetching}>祝日を自動取得（今年・来年）</Button>
          {holidays.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearAll}>すべてクリア</Button>
          )}
          <span className="text-xs text-navy-400 ml-auto">{holidays.length}日 設定中</span>
        </div>

        {/* 左カレンダー：右リスト */}
        <div className="flex gap-6">
          {/* 左: コンパクトカレンダー */}
          <div className="shrink-0 w-52">
            {/* 年月ナビ */}
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={prevMonth} className="w-6 h-6 rounded flex items-center justify-center hover:bg-cream-100 text-navy-300 hover:text-navy-500 transition-colors" aria-label="前月">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-sm font-heading font-semibold text-navy-700">{viewYear}年{viewMonth + 1}月</span>
              <button type="button" onClick={nextMonth} className="w-6 h-6 rounded flex items-center justify-center hover:bg-cream-100 text-navy-300 hover:text-navy-500 transition-colors" aria-label="翌月">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7">
              {WEEKDAYS.map((wd, i) => (
                <div key={wd} className={cn(
                  'text-center text-[10px] py-0.5 font-medium',
                  i === 0 && 'text-red-400', i === 6 && 'text-sky-400',
                  i > 0 && i < 6 && 'text-navy-300',
                )}>{wd}</div>
              ))}
            </div>

            {/* 日付グリッド */}
            <div className="grid grid-cols-7">
              {days.map((cell, i) => {
                if (!cell) return <div key={`e-${i}`} className="h-7" />;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => toggleHoliday(cell.date)}
                    title={cell.isHoliday ? 'クリックで解除' : 'クリックで休日に設定'}
                    className={cn(
                      'h-7 flex items-center justify-center text-xs transition-colors rounded',
                      cell.isHoliday
                        ? 'bg-red-500 text-white font-bold hover:bg-red-600'
                        : 'hover:bg-cream-100',
                      !cell.isHoliday && cell.isToday && 'ring-1 ring-gold/50 font-bold text-gold',
                      !cell.isHoliday && cell.dow === 0 && 'text-red-400',
                      !cell.isHoliday && cell.dow === 6 && 'text-sky-400',
                      !cell.isHoliday && cell.dow > 0 && cell.dow < 6 && 'text-navy-600',
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 右: 設定済み休日リスト（全件） */}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-medium text-navy-400 mb-2">設定済み休日</h4>
            {holidays.length === 0 ? (
              <p className="text-sm text-navy-400 py-6 text-center">休日が登録されていません</p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto space-y-0.5 pr-1">
                {holidays.map(d => {
                  const dt = new Date(d + 'T00:00:00');
                  const dow = DOW_LABEL[dt.getDay()];
                  return (
                    <div key={d} className="flex items-center gap-2 py-1 text-sm group">
                      <span className="text-navy-600 tabular-nums">{d.replace(/-/g, '/')}（{dow}）</span>
                      {holidayNames[d] && <span className="text-gold text-xs font-medium">{holidayNames[d]}</span>}
                      <button type="button" onClick={() => removeHoliday(d)} className="ml-auto text-navy-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs">×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/* ── お知らせタブ ── */
function AnnouncementTab({ form, update }: { form: Partial<ClinicSettings>; update: (p: Partial<ClinicSettings>) => void }) {
  const ann = form.announcement || { active: false, type: 'info' as const, message: '', startDate: null, endDate: null };
  const maint = form.maintenance || { startDate: null, endDate: null };

  function updateAnn(patch: Partial<typeof ann>) {
    update({ announcement: { ...ann, ...patch } });
  }
  function updateMaint(patch: Partial<typeof maint>) {
    update({ maintenance: { ...maint, ...patch } });
  }

  function clearAnn() {
    update({ announcement: { active: false, type: 'info', message: '', startDate: null, endDate: null } });
  }
  function clearMaint() {
    update({ maintenance: { startDate: null, endDate: null } });
  }

  const hasAnnData = ann.active || ann.message || ann.startDate || ann.endDate;
  const hasMaintData = maint.startDate || maint.endDate;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-navy-700">お知らせバナー</h3>
            {hasAnnData && (
              <Button size="sm" variant="ghost" onClick={clearAnn}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                クリア
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={ann.active} onChange={e => updateAnn({ active: e.target.checked })} className="rounded text-gold" />
            <span className="text-sm text-navy-500">有効</span>
          </label>
          {ann.active && (
            <>
              <Select label="種別" value={ann.type} onChange={e => updateAnn({ type: e.target.value as 'info' | 'warning' | 'maintenance' })} options={[
                { value: 'info', label: 'お知らせ' },
                { value: 'warning', label: '注意' },
                { value: 'maintenance', label: 'メンテナンス' },
              ]} />
              <Textarea label="メッセージ" value={ann.message} onChange={e => updateAnn({ message: e.target.value })} rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="開始日時" type="datetime-local" value={ann.startDate || ''} onChange={e => updateAnn({ startDate: e.target.value || null })} />
                <Input label="終了日時" type="datetime-local" value={ann.endDate || ''} onChange={e => updateAnn({ endDate: e.target.value || null })} />
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-navy-700">メンテナンスモード</h3>
            {hasMaintData && (
              <Button size="sm" variant="ghost" onClick={clearMaint}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                クリア
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <Alert variant="warning">メンテナンス期間中は管理者以外アクセス不可になります</Alert>
          <div className="grid grid-cols-2 gap-3">
            <Input label="開始日時" type="datetime-local" value={maint.startDate || ''} onChange={e => updateMaint({ startDate: e.target.value || null })} />
            <Input label="終了日時" type="datetime-local" value={maint.endDate || ''} onChange={e => updateMaint({ endDate: e.target.value || null })} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ── 利用規約タブ（C2） ── */
function TermsTab({ form, update }: { form: Partial<ClinicSettings>; update: (p: Partial<ClinicSettings>) => void }) {
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
      showToast(`バージョンを ${newVer} に更新しました。全管理者に再同意が求められます。`, 'success');
    } catch {
      showToast('バージョン更新に失敗しました', 'error');
    } finally {
      setBumping(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-navy-700">利用規約</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-navy-400 tabular-nums">
                v{termsVersion}
                {termsUpdatedAt && ` (${new Date(termsUpdatedAt).toLocaleDateString('ja-JP')} 更新)`}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Textarea
            label="利用規約テキスト"
            value={form.termsOfService || ''}
            onChange={e => update({ termsOfService: e.target.value })}
            rows={10}
            placeholder="管理者がログイン時に同意する利用規約を入力してください"
          />
          <p className="text-[11px] text-navy-400">
            管理者の初回ログイン時、またはバージョン更新後に表示されます。
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-navy-700">バージョン管理</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          <Alert variant="warning">
            バージョンを更新すると、全管理者が次回ログイン時に利用規約・プライバシーポリシーへの再同意を求められます。
          </Alert>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={handleBumpVersion} loading={bumping}>
              バージョンを更新（v{termsVersion} → v{termsVersion.split('.')[0]}.{parseInt(termsVersion.split('.')[1] || '0', 10) + 1}）
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ── アカウントタブ ── */
function AccountsTab({ adminUsers }: { adminUsers: ReturnType<typeof useAdminUsers> }) {
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
      showToast(`ユーザーの登録上限は${MAX_ADMIN_USERS}人までです。`, 'error');
      return;
    }
    if (!email || !password) { showToast('メールとパスワードを入力してください', 'error'); return; }
    const check = isStrongPassword(password);
    if (!check.valid) { showToast(check.reason!, 'error'); return; }
    setCreating(true);
    try {
      await createAdminUser(toHankaku(email), password);
      showToast('ユーザーを作成しました', 'success');
      setEmail('');
      setPassword('');
      await fetchUsers();
    } catch {
      showToast('作成に失敗しました', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminUser(deleteTarget.uid);
      showToast('ユーザーを削除しました', 'success');
      await fetchUsers();
    } catch {
      showToast('削除に失敗しました', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><h3 className="text-sm font-medium text-navy-700">新規ユーザー作成</h3></CardHeader>
        <CardBody className="space-y-3">
          {users.length >= MAX_ADMIN_USERS && (
            <Alert variant="warning">ユーザーの登録上限は{MAX_ADMIN_USERS}人までです。</Alert>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="メールアドレス" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={users.length >= MAX_ADMIN_USERS} />
            <Input label="パスワード" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={users.length >= MAX_ADMIN_USERS} />
          </div>
          <Button size="sm" onClick={handleCreate} loading={creating} disabled={users.length >= MAX_ADMIN_USERS}>作成</Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="text-sm font-medium text-navy-700">ユーザー一覧</h3></CardHeader>
        <CardBody>
          {loading ? <Spinner className="py-4" /> : users.length === 0 ? (
            <p className="text-sm text-navy-400 py-4 text-center">ユーザーがいません</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left">
                  <th className="px-3 py-2 text-xs text-navy-400">メール</th>
                  <th className="px-3 py-2 text-xs text-navy-400">作成日</th>
                  <th className="px-3 py-2 text-xs text-navy-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid} className="border-b border-cream-200">
                    <td className="px-3 py-2 text-navy-700">{maskEmail(u.email)}</td>
                    <td className="px-3 py-2 text-navy-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('ja-JP') : '-'}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(u)}>削除</Button>
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
        title="ユーザー削除"
        message={`${deleteTarget?.email} を削除しますか？`}
        okLabel="削除する"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
