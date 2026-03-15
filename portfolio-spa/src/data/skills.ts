export interface SkillCategory {
  name: string;
  items: string[];
}

export const skills: SkillCategory[] = [
  {
    name: 'Frontend',
    items: ['React 19', 'TypeScript', 'Tailwind CSS', 'Vite', 'HTML5 / CSS3'],
  },
  {
    name: 'Backend & Infra',
    items: ['Cloud Functions', 'Firebase Auth', 'Firestore', 'Firebase Hosting'],
  },
  {
    name: 'Security',
    items: ['CSP', 'Firestore Rules', 'RBAC', 'Input Validation'],
  },
  {
    name: 'Libraries & Tools',
    items: ['Claude Code', 'pdf-lib', 'Resend', 'Git / GitHub'],
  },
];
