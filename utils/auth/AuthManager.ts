// AuthManager.ts - синглтон для управления состоянием авторизации
// Позволяет сохранять состояние между перезагрузками страницы и монтированием/размонтированием компонентов

/**
 * Класс для управления состоянием авторизации в приложении
 * Реализует паттерн Синглтон для обеспечения одного экземпляра на всё приложение
 */
export class AuthManager {
  private static instance: AuthManager;
  isInitialized = false;
  
  private constructor() {
    // Приватный конструктор для реализации синглтона
    // Попытка восстановить состояние из localStorage при создании
    if (typeof window !== 'undefined') {
      this.isInitialized = localStorage.getItem('auth_initialized') === 'true';
    }
  }
  
  /**
   * Установка флага инициализации авторизации
   * @param value - Значение флага инициализации
   */
  setInitialized(value: boolean) {
    this.isInitialized = value;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_initialized', String(value));
    }
  }
  
  /**
   * Получение текущего значения флага инициализации
   * @returns Значение флага инициализации
   */
  getInitialized(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Сброс состояния авторизации (например, при выходе пользователя)
   */
  reset() {
    this.isInitialized = false;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_initialized');
    }
  }
  
  /**
   * Получение единственного экземпляра AuthManager
   */
  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }
}

// Экспортируем инстанс синглтона для использования в приложении
export const authManager = AuthManager.getInstance(); 