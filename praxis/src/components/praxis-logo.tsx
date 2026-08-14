import Image from "next/image";

export function PraxisLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className="inline-flex items-center">
      <Image
        src="/new_praxis_logo.png"
        alt="Praxis"
        width={1702}
        height={646}
        className={`${className ?? ""} dark:hidden`}
        priority={priority}
      />
      <Image
        src="/praxis-dark-logo.png"
        alt=""
        width={666}
        height={375}
        className={`${className ?? ""} hidden dark:block`}
        priority={priority}
      />
    </span>
  );
}
