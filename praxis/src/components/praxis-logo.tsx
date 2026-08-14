import Image from "next/image";

export function PraxisLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/final_logo.png"
      alt="Praxis"
      width={300}
      height={73}
      className={className}
      priority={priority}
    />
  );
}
