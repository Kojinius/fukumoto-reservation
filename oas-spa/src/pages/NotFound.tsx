import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/** 404 ページ */
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-lien-50 dark:bg-lien-900 px-4">
      <Card className="max-w-md w-full text-center">
        <CardBody className="py-12">
          <div className="text-6xl font-mono font-bold text-lien-300 dark:text-lien-600 mb-4">404</div>
          <h2 className="text-xl font-heading font-bold text-lien-900 dark:text-lien-50 mb-3">
            ページが見つかりません
          </h2>
          <p className="text-sm text-lien-500 dark:text-lien-400 mb-6">
            お探しのページは存在しないか、移動された可能性があります。
          </p>
          <Button onClick={() => navigate('/')}>トップページへ</Button>
        </CardBody>
      </Card>
    </div>
  );
}
