/** Theme, accent and density switches — the three knobs the gallery exposes. */

export type ThemeName = "dark" | "light";
export type BrandName = "cyan" | "lime" | "amber" | "rose" | "violet" | "mint";
export type Density = "compact" | "default" | "comfortable";

const DENSITY: Record<Density, { control: string; fieldPad: string }> = {
  compact: { control: "26px", fieldPad: "0 8px" },
  default: { control: "30px", fieldPad: "0 10px" },
  comfortable: { control: "36px", fieldPad: "0 12px" },
};

export function applyTheme(theme: ThemeName, root: HTMLElement = document.documentElement): void {
  root.dataset.agTheme = theme;
}

export function applyBrand(brand: BrandName | `#${string}`, root: HTMLElement = document.documentElement): void {
  if (brand.startsWith("#")) root.style.setProperty("--ag-seed", brand);
  else root.dataset.agBrand = brand;
}

export function applyDensity(density: Density, root: HTMLElement = document.documentElement): void {
  const tokens = DENSITY[density];
  root.style.setProperty("--ag-control", tokens.control);
  root.style.setProperty("--ag-field-pad", tokens.fieldPad);
  root.dataset.agDensity = density;
}

/** Parse `?theme=light` style overrides, else follow the OS preference. */
export function resolveTheme(search = location.search, media = matchMedia("(prefers-color-scheme: light)")): ThemeName {
  const param = new URLSearchParams(search).get("theme");
  if (param === "light" || param === "dark") return param;
  return media.matches ? "light" : "dark";
}
