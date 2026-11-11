import type { ComponentProps, MouseEvent } from "react";
import { vi } from "vitest";
import type NextLink from "next/link";

/** Where a plain click on a `MockLink` would have taken the app. */
export const navigate = vi.fn<(href: string) => void>();

/**
 * Stands in for `next/link`, which needs a mounted App Router to navigate.
 * Like the real one, a plain click calls `onNavigate`, then navigates unless
 * the handler prevented it.
 */
export default function MockLink({
  href,
  onNavigate,
  children,
  ...props
}: ComponentProps<typeof NextLink>) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    let prevented = false;
    onNavigate?.({ preventDefault: () => (prevented = true) });
    if (!prevented) navigate(String(href));
  }
  return (
    <a href={String(href)} {...props} onClick={onClick}>
      {children}
    </a>
  );
}
