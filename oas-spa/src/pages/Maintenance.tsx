import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useClinic } from '@/hooks/useClinic';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/** メンテナンス期間外か判定 */
function isMaintenanceOver(clinic: { maintenance: { startDate: string | null; endDate: string | null } } | null): boolean {
  if (!clinic?.maintenance.startDate) return true;
  const now = new Date();
  const start = new Date(clinic.maintenance.startDate);
  const end = clinic.maintenance.endDate ? new Date(clinic.maintenance.endDate) : null;
  if (now < start) return true;
  if (end && now > end) return true;
  return false;
}

/** メンテナンスページ */
export default function Maintenance() {
  const { clinic } = useClinic();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [checking, setChecking] = useState(false);
  const [stillMaint, setStillMaint] = useState(false);

  function handleCheck() {
    setChecking(true);
    setStillMaint(false);
    /* clinic はリアルタイムリスナーで常に最新 — 少し待って判定 */
    setTimeout(() => {
      if (isMaintenanceOver(clinic)) {
        navigate('/');
      } else {
        setStillMaint(true);
      }
      setChecking(false);
    }, 600);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 relative overflow-hidden">
      {/* 装飾ドット */}
      <div className="absolute top-20 left-[15%] w-2 h-2 rounded-full bg-gold/20" />
      <div className="absolute top-32 right-[20%] w-1.5 h-1.5 rounded-full bg-navy-200/30" />
      <div className="absolute bottom-24 left-[25%] w-1 h-1 rounded-full bg-gold/15" />
      <div className="absolute bottom-40 right-[15%] w-2.5 h-2.5 rounded-full bg-navy-200/20" />
      <div className="absolute top-1/4 right-[10%] w-1 h-1 rounded-full bg-gold/10" />
      <div className="absolute bottom-1/3 left-[10%] w-1.5 h-1.5 rounded-full bg-navy-300/15" />
      <Card className="max-w-md w-full text-center animate-fade-in-up">
        <CardBody className="py-12">
          {/* ツールアイコン */}
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-navy-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-navy-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 5.384a2.025 2.025 0 01-2.864-2.864l5.384-5.384m2.864 2.864L18 7.5V3h-4.5l-7.08 7.08m4.5 4.5l-2.864-2.864M3 3l3 3" />
            </svg>
          </div>
          <h2 className="text-xl font-heading font-semibold text-navy-700 mb-3">
            {t('maintenance.title')}
          </h2>
          <p className="text-sm text-navy-400 mb-1">
            {t('maintenance.message')}
          </p>
          <p className="text-sm text-navy-400 mb-6">
            {t('maintenance.wait')}
          </p>

          <Button variant="secondary" onClick={handleCheck} loading={checking}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            {t('maintenance.checkButton')}
          </Button>
          {stillMaint && (
            <p className="text-xs text-danger mt-3">{t('maintenance.stillActive')}</p>
          )}

          {clinic?.phone && (
            <p className="mt-6 pt-4 border-t border-cream-300/40 text-sm text-navy-300">
              {/* urgentContactの電話番号部分をリンクに差し替えてレンダリング */}
              {t('urgentContact', { phone: clinic.phone })
                .split(clinic.phone)
                .reduce<ReactNode[]>((acc, part, i, arr) => {
                  acc.push(part);
                  if (i < arr.length - 1) {
                    acc.push(
                      <a key="phone" href={`tel:${clinic.phone}`} className="text-gold font-medium link-gold-underline">
                        {clinic.phone}
                      </a>
                    );
                  }
                  return acc;
                }, [])}
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
