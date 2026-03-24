import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/** 404 ページ */
export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

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
          <div className="text-7xl font-display font-light text-navy-200 mb-4 tracking-wider">
            404
          </div>
          <h2 className="text-xl font-heading font-semibold text-navy-700 mb-3">
            {t('notFound.title')}
          </h2>
          <p className="text-sm text-navy-400 mb-6">
            {t('notFound.description')}
          </p>
          <Button onClick={() => navigate('/')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            {t('topPage')}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
