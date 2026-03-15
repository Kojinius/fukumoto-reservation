import { Hero } from '@/components/Hero';
import { ProjectCard } from '@/components/ProjectCard';
import { TechSection } from '@/components/TechSection';
import { Footer } from '@/components/Footer';
import { projects } from '@/data/projects';

/** ポートフォリオトップページ（既存 App.tsx の中身を移動） */
export default function Home() {
  return (
    <>
      <main>
        <Hero />

        {/* ── Projects ── */}
        <section className="max-w-3xl mx-auto px-6 pb-16">
          <div
            className="flex items-center gap-4 mb-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '450ms' }}
          >
            <div className="h-px flex-1 bg-brown-200 dark:bg-brown-800" />
            <h2 className="text-xs font-bold tracking-[0.12em] uppercase text-brown-500">
              Projects
            </h2>
            <div className="h-px flex-1 bg-brown-200 dark:bg-brown-800" />
          </div>
          <div className="flex flex-col gap-4">
            {projects.map((project, i) => (
              <ProjectCard
                key={project.name}
                project={project}
                index={i}
                style={{ animationDelay: `${500 + i * 60}ms` }}
              />
            ))}
          </div>
        </section>

        <TechSection />
      </main>
      <Footer />
    </>
  );
}
