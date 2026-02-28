export default function Attribution({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-0.5 ${className}`}>
      <p className="text-[10px] text-center" style={{ color: '#7A7670' }}>
        Hecho con ♥ y 🤖 por{' '}
        <a
          href="https://pepeblasco.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-[#1A2C3D]"
        >
          Pepe Blasco
        </a>
      </p>
      <p className="text-[10px] text-center" style={{ color: '#7A7670' }}>
        <a
          href="https://github.com/pepebndc/mideplanos"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-[#1A2C3D]"
        >
          Contribuye a este proyecto Open Source
        </a>
      </p>
    </div>
  );
}
