'use client';

import React from 'react';
import NextLink from 'next/link';
import { useRouter, usePathname, useSearchParams as useNextSearchParams } from 'next/navigation';

export function Link({ to, href, children, ...props }: any) {
  const target = to || href || '#';
  return (
    <NextLink href={target} {...props}>
      {children}
    </NextLink>
  );
}

export function NavLink({ to, href, className, children, end, ...props }: any) {
  const pathname = usePathname();
  const target = to || href || '';
  const isActive = end ? pathname === target : pathname.startsWith(target);
  const resolvedClass = typeof className === 'function' ? className({ isActive }) : className;
  return (
    <NextLink href={target} className={resolvedClass} {...props}>
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useRouter();
  return (to: string) => {
    router.push(to);
  };
}

export function useSearchParams() {
  const searchParams = useNextSearchParams();
  return [searchParams] as const;
}

export function useLocation() {
  const pathname = usePathname();
  return { pathname };
}
