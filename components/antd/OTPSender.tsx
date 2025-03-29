import React, { forwardRef, useImperativeHandle } from 'react';
import { DataProvider } from '@plasmicapp/host';

interface OTPSenderProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  children?: React.ReactNode; // Поддержка дочерних элементов
}

interface OTPSenderActions {
  sendOTP: (email: string) => Promise<{ success: boolean; message: string }>;
}

const OTPSender = forwardRef<OTPSenderActions, OTPSenderProps>(({ 
  onSuccess, 
  onError,
  children 
}, ref) => {
  // Устанавливаем начальное значение вместо null
  const [result, setResult] = React.useState<{ 
    success: boolean; 
    message: string;
  }>({
    success: false,
    message: "Waiting for OTP send operation"
  });

  // Сообщаем в консоль о текущем состоянии result для отладки
  React.useEffect(() => {
    console.log("OTPSender result:", result);
  }, [result]);

  useImperativeHandle(ref, () => ({
    // Функция для отправки OTP, которая будет вызываться через Element Action
    sendOTP: async (email: string) => {
      try {
        console.log("Sending OTP to:", email);
        
        // Устанавливаем промежуточный статус отправки
        setResult({
          success: false,
          message: `Sending OTP to ${email}...`
        });
        
        // Создаем искусственную задержку в 5 секунд
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Здесь будет реальная логика отправки OTP кода
        // Сейчас это заглушка, которая всегда возвращает успех
        const newResult = { 
          success: true, 
          message: `Test function executed for ${email}` 
        };
        
        // Сохраняем результат в состоянии компонента
        setResult(newResult);
        console.log("OTP sent successfully, new result:", newResult);

        // Вызываем соответствующий колбэк в зависимости от результата
        if (newResult.success && onSuccess) {
          onSuccess(newResult.message);
        } else if (!newResult.success && onError) {
          onError(newResult.message);
        }

        return newResult;
      } catch (error) {
        // В случае ошибки
        const errorResult = { 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        };
        
        setResult(errorResult);
        console.error("Error sending OTP:", errorResult);
        
        if (onError) {
          onError(errorResult.message);
        }
        
        return errorResult;
      }
    }
  }), [onSuccess, onError]);

  // Предоставляем данные о результате через DataProvider дочерним компонентам
  return (
    <DataProvider name="otpSenderResult" data={result}>
      {children ? (
        // Если есть дочерние элементы - отображаем их
        <>{children}</>
      ) : (
        // Если дочерних элементов нет - создаем невидимый элемент
        <div style={{ display: 'none' }}></div>
      )}
    </DataProvider>
  );
});

OTPSender.displayName = 'OTPSender';

export default OTPSender; 