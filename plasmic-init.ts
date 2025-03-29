import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import OtpInput from "./components/antd/OtpInput";
import OTPSender from "./components/antd/OTPSender";
import OTPVerify from "./components/antd/OTPVerify";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "cHJCXRMUUC7xsY249j6Rzu",
      token: "wF4acpL5EIITyEQcEOOIXEl6FH9usLuICiCH5cKdo7EZD9IDPWGhi5Npcw3bpuKt6rsitpE9nSUYBa4JPuQ",
    },
  ],

  // By default Plasmic will use the last published version of your project.
  // For development, you can set preview to true, which will use the unpublished
  // project, allowing you to see your designs without publishing.  Please
  // only use this for development, as this is significantly slower.
  preview: true,
});

// You can register any code components that you want to use here; see
// https://docs.plasmic.app/learn/code-components-ref/
// And configure your Plasmic project to use the host url pointing at
// the /plasmic-host page of your nextjs app (for example,
// http://localhost:3000/plasmic-host).  See
// https://docs.plasmic.app/learn/app-hosting/#set-a-plasmic-project-to-use-your-app-host

// Register components
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
