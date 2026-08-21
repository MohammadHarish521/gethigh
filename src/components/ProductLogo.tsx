type ProductLogoProps = {
  src: string;
  name: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "h-11 w-11 rounded-[10px]",
  md: "h-14 w-14 rounded-xl",
  lg: "h-20 w-20 rounded-2xl",
};

export function ProductLogo({ src, name, size = "sm" }: ProductLogoProps) {
  return (
    <img
      src={src}
      alt={`${name} logo`}
      className={`${sizes[size]} border border-line bg-white object-cover shadow-[var(--shadow-card)]`}
    />
  );
}
