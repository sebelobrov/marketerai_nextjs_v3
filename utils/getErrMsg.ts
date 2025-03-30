// Функция для получения сообщения ошибки
// Принимает ошибку в любом формате и возвращает строку с сообщением
export default function getErrMsg(error: any): string {
  // Если error - это строка, просто возвращаем
  if (typeof error === 'string') {
    return error;
  }

  // Если error - это объект с полем message, возвращаем это поле
  if (error && typeof error === 'object' && 'message' in error) {
    return error.message as string;
  }

  // Если error - это объект с полем msg, возвращаем это поле
  if (error && typeof error === 'object' && 'msg' in error) {
    return error.msg as string;
  }

  // Если error - это объект с полем error, возвращаем это поле (возможно рекурсивно)
  if (error && typeof error === 'object' && 'error' in error) {
    if (typeof error.error === 'string') {
      return error.error;
    }
    return getErrMsg(error.error);
  }

  // В противном случае, преобразуем в строку
  try {
    return JSON.stringify(error);
  } catch (e) {
    return String(error);
  }
} 