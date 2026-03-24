import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useClinic } from '@/hooks/useClinic';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

/**
 * 番号付き段落（例: "１．○○" "2.△△"）をセクション分割して表示。
 * 改行はそのまま改行として描画する。
 */
function parseSections(text: string): { title: string; body: string }[] {
  const lines = text.split('\n');
  const sections: { title: string; body: string }[] = [];
  const numPattern = /^[０-９0-9]+[．.]/;

  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    if (numPattern.test(line.trim())) {
      if (current) sections.push({ title: current.title, body: current.lines.join('\n') });
      current = { title: line.trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      /* 番号なし冒頭テキスト */
      current = { title: '', lines: [line] };
    }
  }
  if (current) sections.push({ title: current.title, body: current.lines.join('\n') });
  return sections;
}

/** プライバシーポリシー表示ページ */
export default function PrivacyPolicy() {
  const { t } = useTranslation('booking');
  const { clinic, loading } = useClinic();

  const sections = useMemo(() => {
    if (!clinic?.privacyPolicy) return [];
    return parseSections(clinic.privacyPolicy);
  }, [clinic?.privacyPolicy]);

  if (loading) return <Spinner className="py-12" />;

  return (
    <div className="animate-fade-in-up">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <h2 className="text-lg font-heading font-semibold text-navy-700">
            {t('privacy.title')}
          </h2>
        </CardHeader>
        <CardBody>
          {sections.length > 0 ? (
            <div className="space-y-6">
              {sections.map((sec, i) => (
                <section key={i}>
                  {sec.title && (
                    <h3 className="text-sm font-heading font-semibold text-navy-700 mb-2">
                      {sec.title}
                    </h3>
                  )}
                  {sec.body.trim() && (
                    <p className="text-sm text-navy-600 leading-relaxed whitespace-pre-line">
                      {sec.body.trim()}
                    </p>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <p className="text-sm text-navy-400">
              {t('privacy.notSet')}
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
