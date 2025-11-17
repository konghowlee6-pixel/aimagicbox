interface AuthCardProps {
  children: React.ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      {/* Solid white card with soft shadows and rounded corners */}
      <div 
        className="bg-white rounded-2xl p-10"
        style={{
          boxShadow: '0 20px 60px 0 rgba(0, 0, 0, 0.3), 0 10px 30px 0 rgba(0, 0, 0, 0.2)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
