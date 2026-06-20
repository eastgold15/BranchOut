/* 星座主题 - 星球发光状态色 */
export const planetColors: Record<
  string,
  { shell: string; core: string; ring: string }
> = {
  untouched: { shell: "#5C6B4F", core: "#2D3A28", ring: "" },
  mentioned: { shell: "#34D399", core: "#6EE7B7", ring: "" },
  explored: { shell: "#A78BFA", core: "#C4B5FD", ring: "#A78BFA" },
  mastered: { shell: "#FCD34D", core: "#FDE68A", ring: "#FCD34D" },
  weak: { shell: "#FB7185", core: "#FDA4AF", ring: "" },
};

export function getNodeScale(depth: number): number {
  const baseScale = 0.42;
  return Math.max(baseScale * (1 - depth * 0.08), baseScale * 0.65);
}
