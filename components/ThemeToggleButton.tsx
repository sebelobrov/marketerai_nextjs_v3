import React, { useContext, forwardRef, useImperativeHandle } from 'react';
// Импортируем DataProvider
import { DataProvider } from "@plasmicapp/host"; 
import { ThemeContext, Theme } from './contexts/ThemeContext';

// Определяем пропсы для компонента, включая className для стилизации в Plasmic
interface ThemeToggleButtonProps {
  className?: string; // Позволяет Plasmic передавать класс для стилей
  // Можно добавить другие пропсы по необходимости, например, для текста кнопки
  children?: React.ReactNode;
}

// Определяем тип для ref handle
export interface ThemeToggleButtonHandle {
  setTheme: (themeValue: Theme) => void;
}

// Используем forwardRef для получения ref
export const ThemeToggleButton = forwardRef<ThemeToggleButtonHandle, ThemeToggleButtonProps>((
  { className, children }, 
  ref
) => {
  const context = useContext(ThemeContext);

  // Предоставляем метод setTheme через ref с помощью useImperativeHandle
  useImperativeHandle(ref, () => ({
    setTheme: (themeValue: Theme) => {
      if (context?.setTheme && (themeValue === 'light' || themeValue === 'dark')) {
        console.log('[ImperativeHandle] Setting theme to:', themeValue);
        context.setTheme(themeValue);
      } else {
        console.warn('[ImperativeHandle] Could not set theme. Invalid context or theme value:', context, themeValue);
      }
    }
  }), [context]); // Зависимость от контекста

  // Если контекст недоступен (в Studio)
  if (!context) {
    return <>{children}</>;
  }

  const { theme } = context;

  return (
    // Оборачиваем кнопку и ее содержимое в DataProvider
    // Предоставляем текущее значение темы под именем 'theme'
    <DataProvider name="theme" data={theme}>
      <div className={className} style={{ display: 'contents' }}>
        {children}
      </div>
    </DataProvider>
  );
});

// Добавляем displayName для отладки в React DevTools
ThemeToggleButton.displayName = "ThemeToggleButton";

// Экспортируем по умолчанию для удобства импорта
export default ThemeToggleButton; 