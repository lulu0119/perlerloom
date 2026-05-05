/**
 * UI derived from shadcn/ui (https://ui.shadcn.com/) generator output (MIT).
 * Project license: GNU Affero General Public License v3.0 or later (see LICENSE).
 */

"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "../utils";

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  );
}

export { Separator };
