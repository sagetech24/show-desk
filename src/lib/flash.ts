import "server-only";
import { cookies } from "next/headers";
import { FLASH_COOKIE, type Flash } from "./flash-shared";

/**
 * Queue a toast to show after the next navigation. Use this in server actions
 * that end with `redirect()`, since the client never receives a return value then.
 * The client-side <Toaster> reads and clears the cookie.
 */
export async function setFlash(message: string, kind: Flash["kind"] = "success") {
  const flash: Flash = { kind, message };
  (await cookies()).set(FLASH_COOKIE, JSON.stringify(flash), { path: "/", maxAge: 30, sameSite: "lax" });
}
