import { useContext } from 'react';
import { ClinicContext } from '@/contexts/ClinicContext';

export function useClinic() {
  return useContext(ClinicContext);
}
