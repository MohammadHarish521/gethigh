function logoMark(letter: string, bg = "#141414") {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r="48" fill="${bg}"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Inter, system-ui, sans-serif" font-size="38" font-weight="600" fill="white">${letter}</text>
    </svg>`,
  )}`;
}

export function makeLogo(name: string, bg = "#141414") {
  const letter = name.trim().charAt(0).toUpperCase() || "G";
  return logoMark(letter, bg);
}

export function siteIconPath(site: string) {
  if (!site.trim()) return "";
  return `/api/favicon?u=${encodeURIComponent(site.trim())}`;
}
