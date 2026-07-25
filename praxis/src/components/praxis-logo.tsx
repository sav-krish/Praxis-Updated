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
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden",
        className,
      )}
    >
      <Image
        src="/new_logo.png"
        alt="Praxis"
        width={300}
        height={73}
        className="col-start-1 row-start-1 h-full max-h-full w-auto object-contain dark:hidden"
        priority={priority}
      />
      <Image
        src="/praxis-dark-logo.png"
        alt="Praxis"
        width={666}
        height={375}
        className="col-start-1 row-start-1 hidden h-full max-h-full w-auto object-contain mix-blend-screen dark:block"
        priority={priority}
      />
    </span>
  );
}
