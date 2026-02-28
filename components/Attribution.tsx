export default function Attribution({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[10px] text-center ${className}`} style={{ color: '#7A7670' }}>
      Hecho con ♥ y 🤖 por{' '}
      <a
        href="https://pepeblasco.com"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 transition-colors hover:text-[#1A2C3D]"
      >
        Pepe Blasco
      </a>
      {' · '}
      <a
        href="https://github.com/pepebndc/mideplanos"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 transition-colors hover:text-[#1A2C3D]"
      >
        Open source
      </a>
    </p>
  );
}
