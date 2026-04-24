/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace google {
  namespace maps {
    namespace places {
      class Autocomplete {
        constructor(
          inputField: HTMLInputElement,
          opts?: {
            componentRestrictions?: {
              country?: string | string[];
            };
          }
        );
        addListener(eventName: string, handler: () => void): void;
        getPlace(): {
          formatted_address?: string;
          geometry?: {
            location?: {
              lat(): number;
              lng(): number;
            };
          };
        };
      }
    }

    namespace event {
      function clearInstanceListeners(instance: unknown): void;
    }
  }
}
