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
      className={`relative inline-flex shrink-0 ${LOGO_SIZE_CLASSES[size]} ${className ?? ""}`}
    >
      <Image
        src="/new_praxis_logo.png"
        alt="Praxis"
        fill
        sizes="(min-width: 640px) 7rem, 6rem"
        className="object-contain dark:hidden"
        priority={priority}
      />
      <Image
        src="/praxis-dark-logo.png"
        alt=""
        fill
        sizes="(min-width: 640px) 7rem, 6rem"
        className="hidden object-cover object-center mix-blend-screen dark:block"
        priority={priority}
      />
    </span>
  );
}
