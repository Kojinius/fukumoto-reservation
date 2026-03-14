import { useClinic } from '@/hooks/useClinic';
import { Card, CardBody } from '@/components/ui/Card';

/** メンテナンスページ */
export default function Maintenance() {
  const { clinic } = useClinic();

  return (
    <div className="min-h-screen flex items-center justify-center bg-lien-50 dark:bg-lien-900 px-4">
      <Card className="max-w-md w-full text-center">
        <CardBody className="py-12">
          <div className="text-4xl mb-4">🔧</div>
          <h2 className="text-xl font-heading font-bold text-lien-900 dark:text-lien-50 mb-3">
            メンテナンス中
          </h2>
          <p className="text-sm text-lien-500 dark:text-lien-400 mb-2">
            現在システムメンテナンスを行っています。
          </p>
          <p className="text-sm text-lien-500 dark:text-lien-400">
            しばらくお待ちください。
          </p>
          {clinic?.phone && (
            <p className="mt-6 text-sm text-lien-400 dark:text-lien-500">
              お急ぎの場合は <a href={`tel:${clinic.phone}`} className="text-accent hover:underline">{clinic.phone}</a> までお電話ください。
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
