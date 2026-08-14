import Image from "next/image";

export function PraxisLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={`inline-flex shrink-0 items-center ${className ?? "h-8 w-auto"}`}>
      <Image
        src="/new_praxis_logo.png"
        alt="Praxis"
        width={1702}
        height={646}
        className="h-full w-auto object-contain dark:hidden"
        priority={priority}
      />
      <span className="relative hidden h-full aspect-[623/232] overflow-hidden dark:block">
        <Image
          src="/praxis-dark-logo.png"
          alt=""
          fill
          sizes="(min-width: 640px) 7rem, 6rem"
          className="object-cover object-center mix-blend-screen"
          priority={priority}
        />
      </span>
    </span>
  );
}
