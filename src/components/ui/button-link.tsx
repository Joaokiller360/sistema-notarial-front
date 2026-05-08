import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

interface ButtonLinkProps extends VariantProps<typeof buttonVariants> {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
  download?: boolean;
}

export function ButtonLink({
  href,
  children,
  variant = "default",
  size = "default",
  className,
  external,
  download,
}: ButtonLinkProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (external || download) {
    return (
      <a
        href={href}
        className={classes}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        download={download}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
