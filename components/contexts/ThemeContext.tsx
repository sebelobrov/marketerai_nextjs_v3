import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

// Экспортируем тип Theme
export type Theme = "light" | "dark";

interface ThemeContextProps {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Экспортируем контекст, чтобы использовать его в ThemeToggleButton
export const ThemeContext = createContext<ThemeContextProps | undefined>(
  undefined
);

// Функция для получения начальной темы
const getInitialTheme = (): Theme => {
  // Проверяем только на клиенте
  if (typeof window !== "undefined") {
    // 1. Проверяем localStorage
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    // Убедимся, что сохраненное значение валидно
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme; // Используем сохраненную тему
    }

    // 2. Если в localStorage нет валидной темы, проверяем системные настройки
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light"; // Используем системную тему
  }

  // 3. Возвращаем светлую тему по умолчанию на сервере или если window недоступен
  return "light";
};


export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  }, []);

  // Сохраняем тему в localStorage при изменении
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      // Также можно добавить/удалить класс на body, если это необходимо для стилей вне Plasmic
      // document.body.classList.remove("light", "dark");
      // document.body.classList.add(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Обновляем возвращаемый тип хука useTheme
export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Эта ошибка будет выброшена только если useTheme используется вне ThemeProvider,
    // что не должно произойти при правильной настройке.
    // Для компонента ThemeToggleButton мы будем использовать useContext напрямую.
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}; 