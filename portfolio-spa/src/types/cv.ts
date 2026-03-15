/** 職務経歴書フォームの型定義 — localStorageキー名はレガシー互換 */

export interface CVBasic {
  name: string;
  furigana: string;
  birthdate: string;
  gender: string;
  zipcode: string;
  address_furigana: string;
  address: string;
  phone: string;
  email: string;
  summary: string;
  pr: string;
}

export interface CareerEntry {
  company: string;
  periodFrom: string;
  periodTo: string;
  employmentType: string;
  description: string;
}

export interface SkillEntry {
  category: string;
  content: string;
}

export interface CVData {
  basic: CVBasic;
  careers: CareerEntry[];
  skills: SkillEntry[];
  photoBase64: string | null;
}

export const CV_STORAGE_KEY = 'shokumukeirekisho_v2';

export const initialCVBasic: CVBasic = {
  name: '', furigana: '', birthdate: '', gender: '',
  zipcode: '', address_furigana: '', address: '',
  phone: '', email: '', summary: '', pr: '',
};

export const emptyCareer: CareerEntry = {
  company: '', periodFrom: '', periodTo: '', employmentType: '', description: '',
};

export const emptySkill: SkillEntry = { category: '', content: '' };

export const initialCVData: CVData = {
  basic: { ...initialCVBasic },
  careers: [{ ...emptyCareer }],
  skills: [{ ...emptySkill }],
  photoBase64: null,
};

export type CVAction =
  | { type: 'SET_BASIC'; field: keyof CVBasic; value: string }
  | { type: 'SET_PHOTO'; value: string | null }
  | { type: 'ADD_CAREER' }
  | { type: 'REMOVE_CAREER'; index: number }
  | { type: 'UPDATE_CAREER'; index: number; field: keyof CareerEntry; value: string }
  | { type: 'ADD_SKILL' }
  | { type: 'REMOVE_SKILL'; index: number }
  | { type: 'UPDATE_SKILL'; index: number; field: keyof SkillEntry; value: string }
  | { type: 'LOAD'; data: CVData }
  | { type: 'RESET' };

export function cvReducer(state: CVData, action: CVAction): CVData {
  switch (action.type) {
    case 'SET_BASIC':
      return { ...state, basic: { ...state.basic, [action.field]: action.value } };
    case 'SET_PHOTO':
      return { ...state, photoBase64: action.value };
    case 'ADD_CAREER':
      return { ...state, careers: [...state.careers, { ...emptyCareer }] };
    case 'REMOVE_CAREER':
      return { ...state, careers: state.careers.filter((_, i) => i !== action.index) };
    case 'UPDATE_CAREER':
      return { ...state, careers: state.careers.map((c, i) => i === action.index ? { ...c, [action.field]: action.value } : c) };
    case 'ADD_SKILL':
      return { ...state, skills: [...state.skills, { ...emptySkill }] };
    case 'REMOVE_SKILL':
      return { ...state, skills: state.skills.filter((_, i) => i !== action.index) };
    case 'UPDATE_SKILL':
      return { ...state, skills: state.skills.map((s, i) => i === action.index ? { ...s, [action.field]: action.value } : s) };
    case 'LOAD':
      return action.data;
    case 'RESET':
      return { ...initialCVData, careers: [{ ...emptyCareer }], skills: [{ ...emptySkill }] };
  }
}
