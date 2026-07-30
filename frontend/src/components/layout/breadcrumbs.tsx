"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function humanize(segment: string): string {
  if (UUID_RE.test(segment)) return "Details";
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// The naive "join every path segment up to here" href below assumes each URL prefix is a
// real page — true almost everywhere, except /admin/parking-lots/[id]/... doesn't have a
// page at the bare [id] prefix (the real detail page lives at the sibling route
// /parking-lots/[id]). This maps that one known mismatch to the route that actually exists.
function resolveHref(segments: string[], index: number): string {
  const prefix = segments.slice(0, index + 1);
  // Only remap when the *current* segment is the uuid itself (index 2) — otherwise a later
  // segment like "edit" that merely follows a uuid earlier in the path would incorrectly
  // collapse to the same href as the uuid crumb, producing duplicate React keys.
  if (
    index === 2 &&
    segments[0] === "admin" &&
    segments[1] === "parking-lots" &&
    UUID_RE.test(segments[2] ?? "")
  ) {
    return `/parking-lots/${segments[2]}`;
  }
  return "/" + prefix.join("/");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = resolveHref(segments, index);
          const isLast = index === segments.length - 1;
          return (
            <span key={`${index}-${segment}`} className="flex items-center gap-1.5">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{humanize(segment)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={href} />}>
                    {humanize(segment)}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
