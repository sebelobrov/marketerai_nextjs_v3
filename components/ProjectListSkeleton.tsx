import React from 'react';

interface ProjectListSkeletonProps {
  itemCount?: number;
  className?: string;
}

export default function ProjectListSkeleton({ 
  itemCount = 3, 
  className = '' 
}: ProjectListSkeletonProps) {
  return (
    <div className={className}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <div 
          key={index}
          style={{
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            backgroundColor: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          {/* Домен проекта */}
          <div 
            style={{
              width: '120px',
              height: '24px',
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
              borderRadius: '4px',
              animation: 'pulse 1.5s infinite ease-in-out'
            }}
          />
          
          {/* Бейдж Trial */}
          <div 
            style={{
              width: '80px',
              height: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '16px',
              animation: 'pulse 1.5s infinite ease-in-out',
              animationDelay: '0.2s'
            }}
          />
          
          {/* Аватары пользователей */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: 3 }).map((_, avatarIndex) => (
              <div 
                key={avatarIndex}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  animation: 'pulse 1.5s infinite ease-in-out',
                  animationDelay: `${0.2 + avatarIndex * 0.1}s`
                }}
              />
            ))}
          </div>
          
          {/* Иконка стрелки */}
          <div 
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '4px',
              animation: 'pulse 1.5s infinite ease-in-out',
              animationDelay: '0.5s'
            }}
          />
        </div>
      ))}
      
      {/* Добавляем CSS-анимацию */}
      <style jsx global>{`
        @keyframes pulse {
          0% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
} 