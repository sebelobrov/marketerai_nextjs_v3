import React, { forwardRef, useImperativeHandle } from 'react';
import { DataProvider } from '@plasmicapp/host';

interface OTPVerifyProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  children?: React.ReactNode; // Поддержка дочерних элементов
}

interface OTPVerifyActions {
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
}

const OTPVerify = forwardRef<OTPVerifyActions, OTPVerifyProps>(({ 
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
    message: "Waiting for OTP verification"
  });

  // Сообщаем в консоль о текущем состоянии result для отладки
  React.useEffect(() => {
    console.log("OTPVerify result:", result);
  }, [result]);

  useImperativeHandle(ref, () => ({
    // Функция для проверки OTP, которая будет вызываться через Element Action
    verifyOTP: async (email: string, otp: string) => {
      try {
        console.log("Verifying OTP for:", email, "with code:", otp);
        
        // Устанавливаем промежуточный статус проверки
        setResult({
          success: false,
          message: `Verifying OTP for ${email}...`
        });
        
        // Создаем искусственную задержку в 5 секунд
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Здесь будет реальная логика проверки OTP кода
        // Сейчас это заглушка, которая всегда возвращает успех
        const newResult = { 
          success: false, 
          message: `OTP verification successful for ${email}` 
        };
        
        // Сохраняем результат в состоянии компонента
        setResult(newResult);
        console.log("OTP verified successfully, new result:", newResult);

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
        console.error("Error verifying OTP:", errorResult);
        
        if (onError) {
          onError(errorResult.message);
        }
        
        return errorResult;
      }
    }
  }), [onSuccess, onError]);

  // Предоставляем данные о результате через DataProvider дочерним компонентам
  return (
    <DataProvider name="otpVerifyResult" data={result}>
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

OTPVerify.displayName = 'OTPVerify';

export default OTPVerify; 