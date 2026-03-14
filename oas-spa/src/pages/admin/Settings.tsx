import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
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

const TABS = ['基本情報', '営業時間', '休日', 'お知らせ', 'アカウント'] as const;
type Tab = typeof TABS[number];
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function Settings() {
  const { clinic, loading: clinicLoading } = useClinic();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('基本情報');
  const [saving, setSaving] = useState(false);

  // 編集中のデータ（clinic からコピー）
  const [form, setForm] = useState<Partial<ClinicSettings>>({});

  // clinic ロード後にフォームを初期化
  useEffect(() => {
    if (clinic) setForm({ ...clinic });
  }, [clinic]);

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
        <h2 className="text-xl font-heading font-bold text-lien-900 dark:text-lien-50">設定</h2>
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

      {/* アカウント */}
      {tab === 'アカウント' && <AccountsTab />}
    </div>
  );
}

/* ── 基本情報タブ ── */
function BasicInfoTab({ form, update }: { form: Partial<ClinicSettings>; update: (p: Partial<ClinicSettings>) => void }) {
  const [zipLoading, setZipLoading] = useState(false);

  async function handleZipLookup() {
    const zip = toHankaku(form.clinicZip || '').replace(/-/g, '');
    if (!/^\d{7}$/.test(zip)) return;
    setZipLoading(true);
    try {
      const addr = await lookupZip(zip);
      if (addr) update({ clinicAddress: addr });
    } finally {
      setZipLoading(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_12rem] gap-4">
          <Input label="院名 *" value={form.clinicName || ''} onChange={e => update({ clinicName: e.target.value })} />
          <Input label="電話番号 *" value={form.phone || ''} onChange={e => update({ phone: e.target.value })} />
        </div>
        <Input label="WebサイトURL" value={form.clinicUrl || ''} onChange={e => update({ clinicUrl: e.target.value })} />
        <div className="grid grid-cols-1 sm:grid-cols-[10rem_auto_1fr] gap-4 items-end">
          <Input label="郵便番号" value={form.clinicZip || ''} onChange={e => update({ clinicZip: e.target.value })} />
          <Button variant="secondary" size="sm" onClick={handleZipLookup} loading={zipLoading} className="mb-0.5">検索</Button>
          <Input label="住所" value={form.clinicAddress || ''} onChange={e => update({ clinicAddress: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Input label="予約締切（分前）" type="number" min={0} value={form.bookingCutoffMinutes ?? 0} onChange={e => update({ bookingCutoffMinutes: Number(e.target.value) })} />
          <Input label="キャンセル締切（分前）" type="number" min={0} value={form.cancelCutoffMinutes ?? 60} onChange={e => update({ cancelCutoffMinutes: Number(e.target.value) })} />
        </div>
        <Textarea label="プライバシーポリシー" value={form.privacyPolicy || ''} onChange={e => update({ privacyPolicy: e.target.value })} rows={6} />
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
                day.open ? 'border-lien-200 dark:border-lien-600 bg-white dark:bg-lien-800' : 'border-lien-100 dark:border-lien-700 bg-lien-50 dark:bg-lien-800/50 opacity-60',
              )}>
                <label className="flex items-center gap-2 w-12 shrink-0">
                  <input type="checkbox" checked={day.open} onChange={e => updateDay(dow, { open: e.target.checked })} className="rounded text-accent" />
                  <span className={cn('text-sm font-medium', i === 0 && 'text-red-500', i === 6 && 'text-sky-500')}>{label}</span>
                </label>
                {day.open && (
                  <>
                    <div className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={day.amOpen} onChange={e => updateDay(dow, { amOpen: e.target.checked })} className="rounded text-accent" />
                      <span className="text-lien-500">午前</span>
                      <input type="time" value={day.amStart} onChange={e => updateDay(dow, { amStart: e.target.value })} className="px-1 py-0.5 border rounded text-xs bg-white dark:bg-lien-700 border-lien-200 dark:border-lien-600" />
                      <span>〜</span>
                      <input type="time" value={day.amEnd} onChange={e => updateDay(dow, { amEnd: e.target.value })} className="px-1 py-0.5 border rounded text-xs bg-white dark:bg-lien-700 border-lien-200 dark:border-lien-600" />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={day.pmOpen} onChange={e => updateDay(dow, { pmOpen: e.target.checked })} className="rounded text-accent" />
                      <span className="text-lien-500">午後</span>
                      <input type="time" value={day.pmStart} onChange={e => updateDay(dow, { pmStart: e.target.value })} className="px-1 py-0.5 border rounded text-xs bg-white dark:bg-lien-700 border-lien-200 dark:border-lien-600" />
                      <span>〜</span>
                      <input type="time" value={day.pmEnd} onChange={e => updateDay(dow, { pmEnd: e.target.value })} className="px-1 py-0.5 border rounded text-xs bg-white dark:bg-lien-700 border-lien-200 dark:border-lien-600" />
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

/* ── 休日タブ ── */
function HolidaysTab({ form, update }: { form: Partial<ClinicSettings>; update: (p: Partial<ClinicSettings>) => void }) {
  const holidays = form.holidays || [];
  const holidayNames = form.holidayNames || {};
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [fetching, setFetching] = useState(false);

  function addHoliday() {
    if (!newDate || holidays.includes(newDate)) return;
    const updated = [...holidays, newDate].sort();
    const names = { ...holidayNames };
    if (newName) names[newDate] = newName;
    update({ holidays: updated, holidayNames: names });
    setNewDate('');
    setNewName('');
  }

  function removeHoliday(d: string) {
    const updated = holidays.filter(h => h !== d);
    const names = { ...holidayNames };
    delete names[d];
    update({ holidays: updated, holidayNames: names });
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
      const newNames = { ...holidayNames, ...merged };
      update({ holidays: newHolidays, holidayNames: newNames });
    } catch {
      /* 取得失敗は無視 */
    } finally {
      setFetching(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex gap-2 items-end flex-wrap">
          <Input label="日付" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-40" />
          <Input label="名称（任意）" value={newName} onChange={e => setNewName(e.target.value)} className="w-40" />
          <Button size="sm" onClick={addHoliday}>追加</Button>
          <Button size="sm" variant="secondary" onClick={fetchJapaneseHolidays} loading={fetching}>祝日を自動取得</Button>
        </div>

        {holidays.length === 0 ? (
          <p className="text-sm text-lien-400 dark:text-lien-500 py-4 text-center">休日が登録されていません</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {holidays.map(d => (
              <div key={d} className="flex items-center justify-between px-3 py-2 bg-lien-50 dark:bg-lien-700/50 rounded-lg text-sm">
                <span className="text-lien-700 dark:text-lien-200">
                  {d} {holidayNames[d] && <span className="text-lien-400 dark:text-lien-500">({holidayNames[d]})</span>}
                </span>
                <button type="button" onClick={() => removeHoliday(d)} className="text-red-400 hover:text-red-600 text-xs">削除</button>
              </div>
            ))}
          </div>
        )}
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><h3 className="text-sm font-bold text-lien-700 dark:text-lien-300">お知らせバナー</h3></CardHeader>
        <CardBody className="space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={ann.active} onChange={e => updateAnn({ active: e.target.checked })} className="rounded text-accent" />
            <span className="text-sm text-lien-600 dark:text-lien-300">有効</span>
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
        <CardHeader><h3 className="text-sm font-bold text-lien-700 dark:text-lien-300">メンテナンスモード</h3></CardHeader>
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

/* ── アカウントタブ ── */
function AccountsTab() {
  const { users, loading, fetchUsers } = useAdminUsers();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ uid: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleCreate() {
    if (!email || !password) { showToast('メールとパスワードを入力してください', 'error'); return; }
    const check = isStrongPassword(password);
    if (!check.valid) { showToast(check.reason!, 'error'); return; }
    setCreating(true);
    try {
      await createAdminUser(toHankaku(email), password);
      showToast('ユーザーを作成しました', 'success');
      setEmail('');
      setPassword('');
      fetchUsers();
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
      fetchUsers();
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
        <CardHeader><h3 className="text-sm font-bold text-lien-700 dark:text-lien-300">新規ユーザー作成</h3></CardHeader>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="メールアドレス" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="パスワード" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button size="sm" onClick={handleCreate} loading={creating}>作成</Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="text-sm font-bold text-lien-700 dark:text-lien-300">ユーザー一覧</h3></CardHeader>
        <CardBody>
          {loading ? <Spinner className="py-4" /> : users.length === 0 ? (
            <p className="text-sm text-lien-400 py-4 text-center">ユーザーがいません</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-lien-200 dark:border-lien-600 text-left">
                  <th className="px-3 py-2 text-xs text-lien-500">メール</th>
                  <th className="px-3 py-2 text-xs text-lien-500">作成日</th>
                  <th className="px-3 py-2 text-xs text-lien-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid} className="border-b border-lien-100 dark:border-lien-700">
                    <td className="px-3 py-2 text-lien-700 dark:text-lien-200">{maskEmail(u.email)}</td>
                    <td className="px-3 py-2 text-lien-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('ja-JP') : '-'}</td>
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
