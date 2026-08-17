import Image from "next/image";

type PraxisLogoSize = "navbar" | "form" | "compact";

const LOGO_SIZE_CLASSES: Record<PraxisLogoSize, string> = {
  navbar: "h-9 w-24 sm:h-10 sm:w-[6.625rem]",
  form: "h-9 w-24 sm:h-10 sm:w-[6.625rem]",
  compact: "h-7 w-[4.625rem] sm:h-8 sm:w-[5.3125rem]",
};

export function PraxisLogo({
  className,
  priority = false,
  size = "navbar",
}: {
  className?: string;
  priority?: boolean;
  size?: PraxisLogoSize;
}) {
  return (
    <span
      role="img"
      aria-label="Praxis"
      className={`relative inline-flex shrink-0 ${LOGO_SIZE_CLASSES[size]} ${className ?? ""}`}
    >
      <Image
        src="/new_praxis_logo.png"
        alt=""
        fill
        sizes="(min-width: 640px) 7rem, 6rem"
        className="object-contain dark:hidden"
        priority={priority}
      />
      <Image
        src="/new_praxis_logo.png"
        alt=""
        fill
        sizes="(min-width: 640px) 7rem, 6rem"
        className="hidden object-contain brightness-0 invert dark:block"
        priority={priority}
      />
      <Image
        src="/new_praxis_logo.png"
        alt=""
        fill
        sizes="(min-width: 640px) 7rem, 6rem"
        className="hidden object-contain dark:block"
        style={{ clipPath: "inset(0 69% 0 0)" }}
        priority={priority}
      />
    </span>
  );
}
