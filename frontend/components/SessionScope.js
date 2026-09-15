"use client";

import { createContext, useContext } from "react";

/**
 * Session owned by the (app) shell layout — pages inside the shell read
 * it here instead of firing their own /users/me on every mount.
 */
export const SessionContext = createContext({ session: null, loading: true });

export function useAppSession() {
  return useContext(SessionContext);
}
