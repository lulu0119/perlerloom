"use client";

import type { ReactElement } from "react";
import { Toaster } from "@perlerloom/ui";

export function AppToaster(): ReactElement {
  return <Toaster richColors closeButton position="top-center" />;
}
