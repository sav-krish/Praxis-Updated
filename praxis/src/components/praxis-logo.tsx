import Image from "next/image";
import { cn } from "@/lib/utils";

export function PraxisLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className="inline-grid shrink-0 place-items-center">
      <Image
        src="/new_logo.png"
        alt="Praxis"
        width={300}
        height={73}
        className={cn("col-start-1 row-start-1 dark:hidden", className)}
        priority={priority}
      />
      <Image
        src="/praxis-dark-logo.png"
        alt="Praxis"
        width={666}
        height={375}
        className={cn(
          "col-start-1 row-start-1 hidden object-contain mix-blend-screen dark:block",
          className,
        )}
        priority={priority}
      />
    </span>
  );
}
