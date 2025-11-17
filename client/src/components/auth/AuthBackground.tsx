interface AuthBackgroundProps {
  children: React.ReactNode;
}

export function AuthBackground({ children }: AuthBackgroundProps) {
  return (
    <div className="min-h-screen relative overflow-hidden animated-gradient-bg">
      {/* Base diagonal gradient - Deep purple from top-left to bottom-right */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#10022B] via-[#32145B] to-[#7427A6] z-0" />
      
      {/* Laser beam and spotlight overlay effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at -20% -20%, rgba(255, 150, 255, 0.28) 0%, transparent 60%),
            linear-gradient(120deg, rgba(200, 82, 255, 0.45) 0%, transparent 70%)
          `,
          mixBlendMode: 'screen',
        }}
      />
      
      {/* Content container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        {children}
      </div>
    </div>
  );
}
