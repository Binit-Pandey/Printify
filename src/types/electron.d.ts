export {};

declare global {
  interface Window {
    printpressDesktop?: {
      isDesktop: boolean;
      platform: string;
      versions: {
        electron: string;
        chrome: string;
        node: string;
      };
      printService?: {
        listPrinters: () => Promise<Array<{
          name: string;
          displayName: string;
          isDefault: boolean;
          status: number;
        }>>;
        directPrint: (deviceName?: string) => Promise<{ ok: boolean }>;
      };
    };
  }
}