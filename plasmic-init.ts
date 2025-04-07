import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import OtpInput from "./components/antd/OtpInput";
import OTPSender from "./components/antd/OTPSender";
import OTPVerify from "./components/antd/OTPVerify";
import ProjectListSkeleton from "./components/ProjectListSkeleton";
import Badge from "./components/antd/Badge";

// Импорт компонентов Supabase
import { 
  SupabaseUserGlobalContext, 
  SupabaseUserGlobalContextMeta 
} from "./components/supabase";

// Логи для отладки
const logPrefix = '[PlasmicInit]';
const debug = (...args: any[]) => console.log(logPrefix, ...args);

debug('Инициализация Plasmic');

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "cHJCXRMUUC7xsY249j6Rzu",
      token: "wF4acpL5EIITyEQcEOOIXEl6FH9usLuICiCH5cKdo7EZD9IDPWGhi5Npcw3bpuKt6rsitpE9nSUYBa4JPuQ",
    },
  ],

  // По умолчанию Plasmic будет использовать последнюю опубликованную версию вашего проекта.
  // Для разработки вы можете установить preview в true, что будет использовать неопубликованный
  // проект, позволяя видеть ваши дизайны без публикации. Пожалуйста,
  // используйте это только для разработки, так как это значительно медленнее.
  preview: true,
});

// Регистрация глобального контекста Supabase
debug('Регистрация SupabaseUserGlobalContext');
PLASMIC.registerGlobalContext(SupabaseUserGlobalContext, SupabaseUserGlobalContextMeta);

// Регистрация компонентов
PLASMIC.registerComponent(OtpInput, {
  name: "OtpInput",
  props: {
    length: {
      type: "number",
      defaultValue: 6,
      description: "The number of input elements"
    },
    value: {
      type: "string",
      defaultValue: "",
      description: "The current value of the OTP input"
    },
    onChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "value",
          type: "string"
        }
      ],
      description: "Triggered when input changes"
    },
    autoFocus: {
      type: "boolean",
      defaultValue: false,
      description: "Auto focus when component is mounted"
    },
    className: {
      type: "string",
      description: "CSS class name"
    },
    style: {
      type: "object",
      description: "CSS styles"
    },
    disabled: {
      type: "boolean",
      defaultValue: false,
      description: "Whether the input is disabled"
    },
    size: {
      type: "choice",
      options: ["small", "middle", "large"],
      defaultValue: "middle",
      description: "Size of the input"
    }
  },
  states: {
    value: {
      type: "writable",
      variableType: "text",
      valueProp: "value",
      onChangeProp: "onChange"
    }
  }
});

// Регистрируем компонент OTPSender
PLASMIC.registerComponent(OTPSender, {
  name: "OTPSender",
  providesData: true,
  props: {
    children: "slot",
    onSuccess: {
      type: "eventHandler",
      description: "Triggered when OTP is sent successfully",
      argTypes: [
        {
          name: "message",
          type: "string"
        }
      ]
    },
    onError: {
      type: "eventHandler",
      description: "Triggered when OTP sending fails",
      argTypes: [
        {
          name: "message",
          type: "string"
        }
      ]
    }
  },
  refActions: {
    sendOTP: {
      description: "Send OTP to the specified email",
      argTypes: [
        {
          name: "email",
          type: "string"
        }
      ]
    }
  }
});

// Регистрируем компонент OTPVerify
PLASMIC.registerComponent(OTPVerify, {
  name: "OTPVerify",
  providesData: true,
  props: {
    children: "slot",
    onSuccess: {
      type: "eventHandler",
      description: "Triggered when OTP is verified successfully",
      argTypes: [
        {
          name: "message",
          type: "string"
        }
      ]
    },
    onError: {
      type: "eventHandler",
      description: "Triggered when OTP verification fails",
      argTypes: [
        {
          name: "message",
          type: "string"
        }
      ]
    }
  },
  refActions: {
    verifyOTP: {
      description: "Verify OTP code",
      argTypes: [
        {
          name: "email",
          type: "string"
        },
        {
          name: "otp",
          type: "string"
        }
      ]
    }
  }
});

// Регистрация компонента скелетона
PLASMIC.registerComponent(ProjectListSkeleton, {
  name: "ProjectListSkeleton",
  props: {
    itemCount: {
      type: "number",
      defaultValue: 3,
      description: "Количество элементов скелетона"
    },
    className: {
      type: "string",
      description: "CSS класс для компонента"
    }
  },
  description: "Скелетон для списка проектов, который отображается во время загрузки"
});

// Регистрация компонента Badge
PLASMIC.registerComponent(Badge, {
  name: "Badge",
  props: {
    count: {
      type: "string",
      description: "Число для отображения в бейдже"
    },
    showZero: {
      type: "boolean",
      defaultValue: false,
      description: "Показывать ли бейдж при нулевом значении"
    },
    overflowCount: {
      type: "number",
      defaultValue: 99,
      description: "Максимальное значение для отображения"
    },
    dot: {
      type: "boolean",
      defaultValue: false,
      description: "Отображать ли только точку вместо числа"
    },
    status: {
      type: "choice",
      options: ["success", "processing", "default", "error", "warning"],
      description: "Статус бейджа"
    },
    color: {
      type: "string",
      description: "Настраиваемый цвет бейджа"
    },
    text: {
      type: "string",
      description: "Текст для отображения рядом со статусом"
    },
    size: {
      type: "choice",
      options: ["default", "small"],
      description: "Размер бейджа"
    },
    children: "slot",
  }
});

// Регистрация компонента ThemeToggleButton
import ThemeToggleButton from "./components/ThemeToggleButton";

PLASMIC.registerComponent(ThemeToggleButton, {
  name: "ThemeToggleButton",
  providesData: true,
  props: {
    className: {
      type: "string",
      description: "CSS class name for styling the button",
    },
    children: {
      type: "slot",
    }
  },
  importPath: "./components/ThemeToggleButton",
  isDefaultExport: true,
  refActions: {
    setTheme: {
      displayName: "Set Theme",
      argTypes: [
        {
          name: "themeValue",
          displayName: "Theme (light/dark)",
          type: { 
            type: "choice", 
            options: ["light", "dark"] 
          },
        },
      ],
    },
  },
  description: "Wrapper component to provide theme state ('light' | 'dark') and actions (setTheme) to children via DataProvider and Element Actions."
});
