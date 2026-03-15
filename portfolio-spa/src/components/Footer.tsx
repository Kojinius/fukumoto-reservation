export function Footer() {
  return (
    <footer className="text-center py-8 px-6 border-t border-brown-200/40 dark:border-brown-800/40">
      <p className="text-xs text-brown-500 dark:text-brown-600">
        &copy; 2026 kojinius.jp &nbsp;|&nbsp; Built with{' '}
        <a
          href="https://claude.ai/claude-code"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brown-600 dark:text-brown-400 hover:text-accent transition-colors"
        >
          Claude Code
        </a>
      </p>
    </footer>
  );
}
