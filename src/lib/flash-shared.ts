export const FLASH_COOKIE = "flash_toast";

export type ToastKind = "success" | "error" | "info";
export type Flash = { kind: ToastKind; message: string };
