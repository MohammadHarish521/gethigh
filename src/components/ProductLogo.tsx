import { useEffect, useState } from "react";
import { makeLogo, siteIconPath } from "../utils/logo";

type ProductLogoProps = {
  src?: string;
  name: string;
  siteUrl?: string;
  size?: "xs" | "sm" | "md" | "lg";
};

const sizes = {
  xs: "h-7 w-7 rounded-[8px]",
  sm: "h-12 w-12 rounded-[12px]",
  md: "h-16 w-16 rounded-[14px]",
  lg: "h-20 w-20 rounded-[16px]",
};

export function ProductLogo({
  src,
  name,
  siteUrl,
  size = "md",
}: ProductLogoProps) {
  const fallback = src?.startsWith("data:") ? src : makeLogo(name, "#508200");
  const icon = siteUrl
    ? siteIconPath(siteUrl)
    : src && !src.startsWith("data:")
      ? src
      : "";
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [siteUrl, src]);

  return (
    <img
      src={!failed && icon ? icon : fallback}
      alt={`${name} logo`}
      onError={() => setFailed(true)}
      className={`${sizes[size]} shrink-0 border border-black/5 bg-white object-contain p-0.5`}
    />
  );
}
