/** 履歴書フォームの型定義 — localStorageキー名はレガシー互換 */

export interface ResumeBasic {
  name: string;
  furigana: string;
  birthdate: string;
  gender: string;
  zipcode: string;
  address_furigana: string;
  address: string;
  phone: string;
  email: string;
  pr: string;
  requests: string;
}

export interface HistoryRow {
  year: string;
  month: string;
  content: string;
}

export interface ResumeData {
  basic: ResumeBasic;
  edu: HistoryRow[];
  work: HistoryRow[];
  certs: HistoryRow[];
  photoBase64: string | null;
}

export const RESUME_STORAGE_KEY = 'rirekisho_v1';

export const initialResumeBasic: ResumeBasic = {
  name: '', furigana: '', birthdate: '', gender: '',
  zipcode: '', address_furigana: '', address: '',
  phone: '', email: '', pr: '', requests: '',
};

export const emptyHistoryRow: HistoryRow = { year: '', month: '', content: '' };

export const initialResumeData: ResumeData = {
  basic: { ...initialResumeBasic },
  edu: [{ ...emptyHistoryRow }],
  work: [{ ...emptyHistoryRow }],
  certs: [{ ...emptyHistoryRow }],
  photoBase64: null,
};

export type ResumeAction =
  | { type: 'SET_BASIC'; field: keyof ResumeBasic; value: string }
  | { type: 'SET_PHOTO'; value: string | null }
  | { type: 'ADD_EDU' }
  | { type: 'REMOVE_EDU'; index: number }
  | { type: 'UPDATE_EDU'; index: number; field: keyof HistoryRow; value: string }
  | { type: 'ADD_WORK' }
  | { type: 'REMOVE_WORK'; index: number }
  | { type: 'UPDATE_WORK'; index: number; field: keyof HistoryRow; value: string }
  | { type: 'ADD_CERT' }
  | { type: 'REMOVE_CERT'; index: number }
  | { type: 'UPDATE_CERT'; index: number; field: keyof HistoryRow; value: string }
  | { type: 'LOAD'; data: ResumeData }
  | { type: 'RESET' };

export function resumeReducer(state: ResumeData, action: ResumeAction): ResumeData {
  switch (action.type) {
    case 'SET_BASIC':
      return { ...state, basic: { ...state.basic, [action.field]: action.value } };
    case 'SET_PHOTO':
      return { ...state, photoBase64: action.value };
    case 'ADD_EDU':
      return { ...state, edu: [...state.edu, { ...emptyHistoryRow }] };
    case 'REMOVE_EDU':
      return { ...state, edu: state.edu.filter((_, i) => i !== action.index) };
    case 'UPDATE_EDU':
      return { ...state, edu: state.edu.map((r, i) => i === action.index ? { ...r, [action.field]: action.value } : r) };
    case 'ADD_WORK':
      return { ...state, work: [...state.work, { ...emptyHistoryRow }] };
    case 'REMOVE_WORK':
      return { ...state, work: state.work.filter((_, i) => i !== action.index) };
    case 'UPDATE_WORK':
      return { ...state, work: state.work.map((r, i) => i === action.index ? { ...r, [action.field]: action.value } : r) };
    case 'ADD_CERT':
      return { ...state, certs: [...state.certs, { ...emptyHistoryRow }] };
    case 'REMOVE_CERT':
      return { ...state, certs: state.certs.filter((_, i) => i !== action.index) };
    case 'UPDATE_CERT':
      return { ...state, certs: state.certs.map((r, i) => i === action.index ? { ...r, [action.field]: action.value } : r) };
    case 'LOAD':
      return action.data;
    case 'RESET':
      return { ...initialResumeData, edu: [{ ...emptyHistoryRow }], work: [{ ...emptyHistoryRow }], certs: [{ ...emptyHistoryRow }] };
  }
}
