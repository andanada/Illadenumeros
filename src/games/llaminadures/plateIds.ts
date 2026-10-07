export const plateDropId = (index: number): string => `plate-${index}`
export const parsePlateId = (id: string | number): number | undefined => {
  const m = /^plate-(\d+)$/.exec(String(id))
  return m ? Number(m[1]) : undefined
}
