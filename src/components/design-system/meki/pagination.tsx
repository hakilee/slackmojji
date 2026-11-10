import { ChevronLeftIcon, ChevronRightIcon } from "~/components/design-system/icons";
import React from "react";
import type { ReactNode } from "react";

import { cn } from "./cn";
import { Flex } from "./flex";

const createPageUrl = (pageNumber: number | string) => `?page=${pageNumber}`;

const generatePages = (currentPage: number, totalPages: number) => {
  const pages: (number | { type: "ellipsis"; position: "left" | "right" })[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i += 1) {
      pages.push(i);
    }
  } else if (currentPage <= 4) {
    for (let i = 1; i <= 5; i += 1) {
      pages.push(i);
    }
    pages.push({ position: "right", type: "ellipsis" }, totalPages);
  } else if (currentPage >= totalPages - 3) {
    pages.push(1, { position: "left", type: "ellipsis" });
    for (let i = totalPages - 4; i <= totalPages; i += 1) {
      pages.push(i);
    }
  } else {
    pages.push(
      1,
      { position: "left", type: "ellipsis" },
      currentPage - 1,
      currentPage,
      currentPage + 1,
      { position: "right", type: "ellipsis" },
      totalPages,
    );
  }
  return pages;
};

interface PaginationProps {
  currentPage: number;
  perPage?: number;
  renderLink: (props: {
    href: string;
    children: ReactNode;
    "aria-current"?: "page" | undefined;
    "aria-label"?: string;
    className: string;
  }) => ReactNode;
  totalCount: number;
}

export const Pagination = ({
  currentPage,
  totalCount,
  perPage = 10,
  renderLink,
}: PaginationProps) => {
  const totalPages = Math.ceil(totalCount / perPage);
  if (totalPages <= 1) {
    return null;
  }
  const pages = generatePages(currentPage, totalPages);
  return (
    <nav aria-label="Pagination">
      <Flex align="center" className="mt-8 gap-1" justify="center">
        {renderLink({
          "aria-label": "Previous page",
          children: <ChevronLeftIcon size={16} />,
          className: cn(
            "flex size-7.5 items-center justify-center rounded-md border border-transparent bg-bg-layer-default text-text-secondary transition-colors",
            "hover:border-neutral-100 hover:bg-neutral-50 hover:text-text-primary",
            currentPage === 1 && "pointer-events-none opacity-50",
          ),
          href: createPageUrl(currentPage - 1),
        })}
        <Flex align="center" gap={4}>
          {pages.map((page) => {
            if (typeof page === "object") {
              return (
                <Flex
                  align="center"
                  className="size-7.5 font-medium text-sm text-text-tertiary"
                  justify="center"
                  key={`ellipsis-${page.position}`}
                >
                  ...
                </Flex>
              );
            }
            const isCurrent = page === currentPage;
            return (
              <React.Fragment key={page}>
                {renderLink({
                  "aria-current": isCurrent ? ("page" as const) : undefined,
                  children: page,
                  className: cn(
                    "flex size-7.5 items-center justify-center rounded-md border border-transparent font-medium text-sm transition-colors",
                    isCurrent
                      ? "bg-neutral-100 text-text-primary"
                      : "bg-bg-layer-default text-text-secondary hover:border-neutral-100 hover:bg-neutral-50 hover:text-text-primary",
                  ),
                  href: createPageUrl(page),
                })}
              </React.Fragment>
            );
          })}
        </Flex>
        {renderLink({
          "aria-label": "Next page",
          children: <ChevronRightIcon size={16} />,
          className: cn(
            "flex size-7.5 items-center justify-center rounded-md border border-transparent bg-bg-layer-default text-text-secondary transition-colors",
            "hover:border-neutral-100 hover:bg-neutral-50 hover:text-text-primary",
            currentPage === totalPages && "pointer-events-none opacity-50",
          ),
          href: createPageUrl(currentPage + 1),
        })}
      </Flex>
    </nav>
  );
};
