import { GlobalContextMeta } from "@plasmicapp/host";
import type { SupabaseUserGlobalContextProps } from ".";

export const SupabaseUserGlobalContextMeta : GlobalContextMeta<SupabaseUserGlobalContextProps> = {
  name: "SupabaseUserGlobalContext",
  displayName: "Supabase User Context",
  description: "Глобальный контекст пользователя Supabase",
  props: {
    defaultRedirectOnLoginSuccess: {
      type: "string",
      displayName: "URL для перенаправления после успешного входа",
      description: "URL страницы, на которую будет перенаправлен пользователь после успешного входа (если не указан в параметрах действия)",
      defaultValue: "/onboarding"
    },
  },
  importPath: "./components/supabase/SupabaseUserGlobalContext",
  providesData: true,
  globalActions: {
    loginWithGoogle: {
      displayName: "Войти через Google",
      description: "Инициирует процесс входа через Google OAuth",
      parameters: [],
    },
    logout: {
      displayName: "Выйти",
      description: "Выполняет выход пользователя",
      parameters: []
    },
    sendOTP: {
      displayName: "Отправить OTP код",
      description: "Отправляет OTP код на указанный email",
      parameters: [
        {
          name: "email",
          type: "string",
          displayName: "Email",
        }
      ]
    },
    verifyOTP: {
      displayName: "Проверить OTP код",
      description: "Проверяет OTP код для входа в систему",
      parameters: [
        {
          name: "email",
          type: "string",
          displayName: "Email",
        },
        {
          name: "otp",
          type: "string",
          displayName: "OTP код",
        }
      ]
    },
  },
}; 