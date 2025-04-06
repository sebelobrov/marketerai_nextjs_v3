/**
 * Упрощенный менеджер состояния авторизации в приложении
 * Синглтон для отслеживания состояния между компонентами
 */
export class AuthManager {
  private static instance: AuthManager;
  
  // Флаг инициализации
  private _isInitialized = false;
  
  // Время последней инициализации
  private _lastInitTime: number = 0;
  
  // Для отслеживания последних событий авторизации
  private _lastAuthEvent: { 
    type: string; 
    timestamp: number;
    sessionId?: string | null;
  } | null = null;
  
  private constructor() {}
  
  /**
   * Установка флага инициализации авторизации
   */
  setInitialized(value: boolean) {
    this._isInitialized = value;
    
    if (value) {
      this._lastInitTime = Date.now();
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AuthManager] Статус инициализации: ${value ? 'инициализирован' : 'не инициализирован'}`);
    }
  }
  
  /**
   * Получение текущего значения флага инициализации
   */
  getInitialized(): boolean {
    return this._isInitialized;
  }
  
  /**
   * Получить время последней инициализации
   */
  getLastInitTime(): number {
    return this._lastInitTime;
  }
  
  /**
   * Записать информацию о событии авторизации
   * Используется для предотвращения обработки дублирующих событий
   */
  recordAuthEvent(eventType: string, sessionId?: string | null) {
    this._lastAuthEvent = {
      type: eventType,
      timestamp: Date.now(),
      sessionId
    };
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AuthManager] Событие авторизации: ${eventType}`);
    }
  }
  
  /**
   * Проверить, было ли недавно такое же событие авторизации
   * Используется для предотвращения повторной обработки событий
   */
  isDuplicateEvent(eventType: string, sessionId?: string | null, maxAge: number = 1000): boolean {
    if (!this._lastAuthEvent) {
      return false;
    }
    
    const now = Date.now();
    const timeSinceLastEvent = now - this._lastAuthEvent.timestamp;
    
    // Проверяем, прошло ли меньше maxAge миллисекунд с последнего события
    // И совпадает ли тип события и идентификатор сессии (если указан)
    if (timeSinceLastEvent < maxAge && 
        this._lastAuthEvent.type === eventType &&
        (sessionId === undefined || this._lastAuthEvent.sessionId === sessionId)) {
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AuthManager] Пропуск дублирующего события: ${eventType} (прошло ${timeSinceLastEvent}мс)`);
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Сброс состояния авторизации (при выходе пользователя)
   */
  reset() {
    this._isInitialized = false;
    this._lastAuthEvent = null;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AuthManager] Состояние сброшено');
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

// Экспортируем инстанс синглтона
export const authManager = AuthManager.getInstance(); 