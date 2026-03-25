// OAS i18n 設定
// 7言語対応: ja / en / zh-CN / vi / ko / pt-BR / tl
// namespace: common, auth, booking, admin, toast

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// --- 日本語 ---
import jaCommon  from './locales/ja/common.json';
import jaAuth    from './locales/ja/auth.json';
import jaBooking from './locales/ja/booking.json';
import jaAdmin   from './locales/ja/admin.json';
import jaToast   from './locales/ja/toast.json';
import jaQuestionnaire from './locales/ja/questionnaire.json';

// --- 英語 ---
import enCommon  from './locales/en/common.json';
import enAuth    from './locales/en/auth.json';
import enBooking from './locales/en/booking.json';
import enAdmin   from './locales/en/admin.json';
import enToast   from './locales/en/toast.json';
import enQuestionnaire from './locales/en/questionnaire.json';

// --- 中国語（簡体字） ---
import zhCNCommon  from './locales/zh-CN/common.json';
import zhCNAuth    from './locales/zh-CN/auth.json';
import zhCNBooking from './locales/zh-CN/booking.json';
import zhCNAdmin   from './locales/zh-CN/admin.json';
import zhCNToast   from './locales/zh-CN/toast.json';
import zhCNQuestionnaire from './locales/zh-CN/questionnaire.json';

// --- ベトナム語 ---
import viCommon  from './locales/vi/common.json';
import viAuth    from './locales/vi/auth.json';
import viBooking from './locales/vi/booking.json';
import viAdmin   from './locales/vi/admin.json';
import viToast   from './locales/vi/toast.json';
import viQuestionnaire from './locales/vi/questionnaire.json';

// --- 韓国語 ---
import koCommon  from './locales/ko/common.json';
import koAuth    from './locales/ko/auth.json';
import koBooking from './locales/ko/booking.json';
import koAdmin   from './locales/ko/admin.json';
import koToast   from './locales/ko/toast.json';
import koQuestionnaire from './locales/ko/questionnaire.json';

// --- ポルトガル語（ブラジル） ---
import ptBRCommon  from './locales/pt-BR/common.json';
import ptBRAuth    from './locales/pt-BR/auth.json';
import ptBRBooking from './locales/pt-BR/booking.json';
import ptBRAdmin   from './locales/pt-BR/admin.json';
import ptBRToast   from './locales/pt-BR/toast.json';
import ptBRQuestionnaire from './locales/pt-BR/questionnaire.json';

// --- フィリピン語 ---
import tlCommon  from './locales/tl/common.json';
import tlAuth    from './locales/tl/auth.json';
import tlBooking from './locales/tl/booking.json';
import tlAdmin   from './locales/tl/admin.json';
import tlToast   from './locales/tl/toast.json';
import tlQuestionnaire from './locales/tl/questionnaire.json';

const resources = {
  ja: {
    common:  jaCommon,
    auth:    jaAuth,
    booking: jaBooking,
    admin:   jaAdmin,
    toast:   jaToast,
    questionnaire: jaQuestionnaire,
  },
  en: {
    common:  enCommon,
    auth:    enAuth,
    booking: enBooking,
    admin:   enAdmin,
    toast:   enToast,
    questionnaire: enQuestionnaire,
  },
  'zh-CN': {
    common:  zhCNCommon,
    auth:    zhCNAuth,
    booking: zhCNBooking,
    admin:   zhCNAdmin,
    toast:   zhCNToast,
    questionnaire: zhCNQuestionnaire,
  },
  vi: {
    common:  viCommon,
    auth:    viAuth,
    booking: viBooking,
    admin:   viAdmin,
    toast:   viToast,
    questionnaire: viQuestionnaire,
  },
  ko: {
    common:  koCommon,
    auth:    koAuth,
    booking: koBooking,
    admin:   koAdmin,
    toast:   koToast,
    questionnaire: koQuestionnaire,
  },
  'pt-BR': {
    common:  ptBRCommon,
    auth:    ptBRAuth,
    booking: ptBRBooking,
    admin:   ptBRAdmin,
    toast:   ptBRToast,
    questionnaire: ptBRQuestionnaire,
  },
  tl: {
    common:  tlCommon,
    auth:    tlAuth,
    booking: tlBooking,
    admin:   tlAdmin,
    toast:   tlToast,
    questionnaire: tlQuestionnaire,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    // localStorageの設定を優先、なければ日本語
    lng: localStorage.getItem('language') || 'ja',
    fallbackLng: 'ja',
    ns: ['common', 'auth', 'booking', 'admin', 'toast', 'questionnaire'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
