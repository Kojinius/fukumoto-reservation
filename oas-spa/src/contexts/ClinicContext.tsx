import { createContext, useEffect, useState, type ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ClinicSettings } from '@/types/clinic';
import { DEFAULT_BUSINESS_HOURS } from '@/types/clinic';

interface ClinicContextValue {
  clinic: ClinicSettings | null;
  loading: boolean;
  isMaintenance: boolean;
}

const DEFAULT_CLINIC: ClinicSettings = {
  clinicName: '',
  phone: '',
  clinicUrl: '',
  clinicZip: '',
  clinicAddress: '',
  clinicAddressSub: '',
  clinicLogo: '',
  businessHours: DEFAULT_BUSINESS_HOURS,
  holidays: [],
  holidayNames: {},
  bookingCutoffMinutes: 0,
  cancelCutoffMinutes: 0,
  announcement: { active: false, type: 'info', message: '', startDate: null, endDate: null },
  maintenance: { startDate: null, endDate: null },
  termsOfService: '',
  privacyPolicy: '',
  sensitiveDataConsentText: '',
  updatedAt: '',
};

export const ClinicContext = createContext<ClinicContextValue>({
  clinic: null,
  loading: true,
  isMaintenance: false,
});

/** メンテナンス期間中か判定 */
function checkMaintenance(clinic: ClinicSettings | null): boolean {
  if (!clinic?.maintenance.startDate) return false;
  const now = new Date();
  const start = new Date(clinic.maintenance.startDate);
  const end = clinic.maintenance.endDate ? new Date(clinic.maintenance.endDate) : null;
  if (now < start) return false;
  if (end && now > end) return false;
  return true;
}

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [clinic, setClinic] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'clinic'),
      (snap) => {
        if (snap.exists()) {
          setClinic({ ...DEFAULT_CLINIC, ...snap.data() } as ClinicSettings);
        } else {
          setClinic(DEFAULT_CLINIC);
        }
        setLoading(false);
      },
      () => {
        setClinic(DEFAULT_CLINIC);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const isMaintenance = checkMaintenance(clinic);

  return (
    <ClinicContext.Provider value={{ clinic, loading, isMaintenance }}>
      {children}
    </ClinicContext.Provider>
  );
}
