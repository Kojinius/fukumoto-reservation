/**
 * 問診票ページ（患者向け）
 * 予約完了後に ?bookingId=xxx でアクセス
 * Firestore の questionnaires コレクションに保存
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/useToast';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';
import type { PainLocation, QuestionnaireFormData } from '@/types/questionnaire';

const PAIN_LOCATIONS: PainLocation[] = [
  'head', 'neck', 'shoulder_left', 'shoulder_right',
  'upper_back', 'lower_back', 'chest', 'abdomen',
  'arm_left', 'arm_right', 'hand_left', 'hand_right',
  'hip_left', 'hip_right', 'leg_left', 'leg_right',
  'knee_left', 'knee_right', 'foot_left', 'foot_right', 'other',
];

const INITIAL_FORM: QuestionnaireFormData = {
  chiefComplaint: '',
  onsetDate: '',
  painScale: 0,
  painLocations: [],
  painType: '',
  dailyImpact: '',
  pastMedicalHistory: '',
  currentTreatments: '',
  currentMedications: '',
  allergies: '',
  surgeryHistory: '',
  sleepQuality: '',
  dietHabits: '',
  exerciseHabits: '',
  stressLevel: 3,
  pregnancyPossibility: '',
  preferredTreatment: '',
  additionalNotes: '',
};

export default function Questionnaire() {
  const { t } = useTranslation('questionnaire');
  const { t: tBooking } = useTranslation('booking');
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [form, setForm] = useState<QuestionnaireFormData>(INITIAL_FORM);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingGender, setBookingGender] = useState('');

  // 予約情報を読み込み、既存の問診票があればプリフィル
  // reservations は isAdmin() 必須のため未認証患者は読めない → Promise.allSettled で個別処理
  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    (async () => {
      try {
        const [resResult, qResult] = await Promise.allSettled([
          getDoc(doc(db, 'reservations', bookingId)),
          getDoc(doc(db, 'questionnaires', bookingId)),
        ]);
        const resSnap = resResult.status === 'fulfilled' ? resResult.value : null;
        const qSnap = qResult.status === 'fulfilled' ? qResult.value : null;
        if (resSnap?.exists()) {
          const d = resSnap.data();
          setPatientName(d.name || '');
          setBookingGender(d.gender || '');
          // 症状をプリフィル
          if (d.symptoms && !qSnap?.exists()) {
            setForm(prev => ({ ...prev, chiefComplaint: d.symptoms }));
          }
        }
        if (qSnap?.exists()) {
          setSubmitted(true);
        }
      } catch {
        // エラー時はそのまま空フォーム表示
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const update = useCallback(<K extends keyof QuestionnaireFormData>(
    key: K, value: QuestionnaireFormData[K],
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const togglePainLocation = useCallback((loc: PainLocation) => {
    setForm(prev => ({
      ...prev,
      painLocations: prev.painLocations.includes(loc)
        ? prev.painLocations.filter(l => l !== loc)
        : [...prev.painLocations, loc],
    }));
  }, []);

  const handleSubmit = async () => {
    if (!bookingId || !form.chiefComplaint.trim()) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      await setDoc(doc(collection(db, 'questionnaires'), bookingId), {
        ...form,
        id: bookingId,
        reservationId: bookingId,
        patientName,
        createdAt: now,
        updatedAt: now,
      });
      setSubmitted(true);
      showToast(t('submitSuccess'), 'success');
    } catch (e) {
      console.error('[Questionnaire] 送信エラー:', e);
      showToast(t('submitError'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner overlay />;

  if (!bookingId) {
    return (
      <div className="text-center py-12">
        <p className="text-navy-500">{t('noBookingId')}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-5 max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-heading font-semibold text-navy-800">{t('submitSuccess')}</h2>
        <p className="text-sm text-navy-500">{t('alreadySubmitted')}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link to="/cancel" state={{ bookingId }}>
            <Button variant="secondary" className="w-full sm:w-auto">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {tBooking('complete.cancelButton')}
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="w-full sm:w-auto">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {tBooking('complete.newReservationButton')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const showPregnancy = bookingGender !== '男性';

  return (
    <div className="space-y-4 pb-8">
      {/* ヘッダー */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-heading font-bold text-navy-800">{t('title')}</h1>
        <p className="text-sm text-navy-500">{t('subtitle')}</p>
        {patientName && (
          <p className="text-sm font-medium text-navy-700">{patientName} 様</p>
        )}
        <p className="text-xs text-navy-400">{t('requiredNote')}</p>
      </div>

      {/* 主訴・症状 */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium text-navy-700">{t('section.mainComplaint')}</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <Textarea
            label={`${t('field.chiefComplaint')} *`}
            placeholder={t('field.chiefComplaintPlaceholder')}
            value={form.chiefComplaint}
            onChange={e => update('chiefComplaint', e.target.value)}
            rows={3}
            maxLength={1000}
            required
          />
          <Input
            label={t('field.onsetDate')}
            placeholder={t('field.onsetDatePlaceholder')}
            value={form.onsetDate}
            onChange={e => update('onsetDate', e.target.value)}
          />
        </CardBody>
      </Card>

      {/* 痛みの詳細 */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium text-navy-700">{t('section.painDetail')}</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* 痛みの程度 */}
          <div>
            <label className="text-sm font-medium text-navy-700 mb-2 block">{t('field.painScale')}</label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-navy-400 w-16 text-right">{t('field.painScaleMin')}</span>
              <input
                type="range"
                min={0} max={10} step={1}
                value={form.painScale}
                onChange={e => update('painScale', Number(e.target.value))}
                className="flex-1 accent-navy-600"
              />
              <span className="text-xs text-navy-400 w-16">{t('field.painScaleMax')}</span>
              <span className="text-lg font-bold text-navy-800 w-8 text-center">{form.painScale}</span>
            </div>
          </div>

          {/* 痛みの部位 */}
          <div>
            <label className="text-sm font-medium text-navy-700 mb-2 block">{t('field.painLocations')}</label>
            <div className="flex flex-wrap gap-1.5">
              {PAIN_LOCATIONS.map(loc => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => togglePainLocation(loc)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    form.painLocations.includes(loc)
                      ? 'bg-navy-800 text-cream border-navy-800'
                      : 'bg-white text-navy-600 border-cream-300 hover:border-navy-400'
                  }`}
                >
                  {t(`painLocation.${loc}`)}
                </button>
              ))}
            </div>
          </div>

          <Input
            label={t('field.painType')}
            placeholder={t('field.painTypePlaceholder')}
            value={form.painType}
            onChange={e => update('painType', e.target.value)}
          />
          <Textarea
            label={t('field.dailyImpact')}
            placeholder={t('field.dailyImpactPlaceholder')}
            value={form.dailyImpact}
            onChange={e => update('dailyImpact', e.target.value)}
            rows={2}
            maxLength={500}
          />
        </CardBody>
      </Card>

      {/* 既往歴・治療状況 */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium text-navy-700">{t('section.medicalHistory')}</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <Textarea
            label={t('field.pastMedicalHistory')}
            placeholder={t('field.pastMedicalHistoryPlaceholder')}
            value={form.pastMedicalHistory}
            onChange={e => update('pastMedicalHistory', e.target.value)}
            rows={2}
            maxLength={500}
          />
          <Input
            label={t('field.currentTreatments')}
            placeholder={t('field.currentTreatmentsPlaceholder')}
            value={form.currentTreatments}
            onChange={e => update('currentTreatments', e.target.value)}
          />
          <Input
            label={t('field.currentMedications')}
            placeholder={t('field.currentMedicationsPlaceholder')}
            value={form.currentMedications}
            onChange={e => update('currentMedications', e.target.value)}
          />
          <Input
            label={t('field.allergies')}
            placeholder={t('field.allergiesPlaceholder')}
            value={form.allergies}
            onChange={e => update('allergies', e.target.value)}
          />
          <Input
            label={t('field.surgeryHistory')}
            placeholder={t('field.surgeryHistoryPlaceholder')}
            value={form.surgeryHistory}
            onChange={e => update('surgeryHistory', e.target.value)}
          />
        </CardBody>
      </Card>

      {/* 生活習慣 */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium text-navy-700">{t('section.lifestyle')}</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <Input
            label={t('field.sleepQuality')}
            placeholder={t('field.sleepQualityPlaceholder')}
            value={form.sleepQuality}
            onChange={e => update('sleepQuality', e.target.value)}
          />
          <Input
            label={t('field.dietHabits')}
            placeholder={t('field.dietHabitsPlaceholder')}
            value={form.dietHabits}
            onChange={e => update('dietHabits', e.target.value)}
          />
          <Input
            label={t('field.exerciseHabits')}
            placeholder={t('field.exerciseHabitsPlaceholder')}
            value={form.exerciseHabits}
            onChange={e => update('exerciseHabits', e.target.value)}
          />

          {/* ストレス度 */}
          <div>
            <label className="text-sm font-medium text-navy-700 mb-2 block">{t('field.stressLevel')}</label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-navy-400">{t('field.stressLow')}</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update('stressLevel', n)}
                    className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                      form.stressLevel === n
                        ? 'bg-navy-800 text-cream'
                        : 'bg-cream-100 text-navy-600 hover:bg-cream-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-xs text-navy-400">{t('field.stressHigh')}</span>
            </div>
          </div>

          {/* 妊娠の可能性 */}
          {showPregnancy && (
            <div>
              <label className="text-sm font-medium text-navy-700 mb-2 block">{t('field.pregnancyPossibility')}</label>
              <div className="flex gap-2">
                {(['yes', 'no', 'na'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => update('pregnancyPossibility', v)}
                    className={`px-4 py-1.5 text-xs rounded-md border transition-colors ${
                      form.pregnancyPossibility === v
                        ? 'bg-navy-800 text-cream border-navy-800'
                        : 'bg-white text-navy-600 border-cream-300 hover:border-navy-400'
                    }`}
                  >
                    {t(`field.pregnancy${v.charAt(0).toUpperCase() + v.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* その他 */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium text-navy-700">{t('section.other')}</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <Input
            label={t('field.preferredTreatment')}
            placeholder={t('field.preferredTreatmentPlaceholder')}
            value={form.preferredTreatment}
            onChange={e => update('preferredTreatment', e.target.value)}
          />
          <Textarea
            label={t('field.additionalNotes')}
            placeholder={t('field.additionalNotesPlaceholder')}
            value={form.additionalNotes}
            onChange={e => update('additionalNotes', e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </CardBody>
      </Card>

      {/* 送信ボタン */}
      <Button
        onClick={handleSubmit}
        loading={submitting}
        disabled={!form.chiefComplaint.trim()}
        className="w-full"
      >
        {t('submit')}
      </Button>
    </div>
  );
}
