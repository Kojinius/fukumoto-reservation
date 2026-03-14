import { useClinic } from '@/hooks/useClinic';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

/** プライバシーポリシー表示ページ */
export default function PrivacyPolicy() {
  const { clinic, loading } = useClinic();

  if (loading) return <Spinner className="py-12" />;

  return (
    <div className="animate-fade-in-up">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <h2 className="text-lg font-heading font-bold text-lien-900 dark:text-lien-50">
            プライバシーポリシー
          </h2>
        </CardHeader>
        <CardBody>
          {clinic?.privacyPolicy ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-lien-700 dark:text-lien-300"
              dangerouslySetInnerHTML={{ __html: clinic.privacyPolicy }}
            />
          ) : (
            <p className="text-sm text-lien-500 dark:text-lien-400">
              プライバシーポリシーは設定されていません。
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
