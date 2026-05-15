/** Rangos de exhibición según nivel de usuario (1–∞), alineado al producto EduPlay. */
export type LevelTierInfo = {
  tierName: string;
  tierBand: 'bronce' | 'plata' | 'oro' | 'diamante' | 'leyenda';
  minLevel: number;
  maxLevel: number | null;
  badgeStyle: 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend_animated';
};

export function levelTierFromUserLevel(level: number): LevelTierInfo {
  const l = Math.max(1, Math.floor(level));
  if (l <= 50)
    return {
      tierName: 'Aprendiz',
      tierBand: 'bronce',
      minLevel: 1,
      maxLevel: 50,
      badgeStyle: 'bronze',
    };
  if (l <= 100)
    return {
      tierName: 'Explorador',
      tierBand: 'plata',
      minLevel: 51,
      maxLevel: 100,
      badgeStyle: 'silver',
    };
  if (l <= 200)
    return {
      tierName: 'Experto',
      tierBand: 'oro',
      minLevel: 101,
      maxLevel: 200,
      badgeStyle: 'gold',
    };
  if (l <= 500)
    return {
      tierName: 'Maestro',
      tierBand: 'diamante',
      minLevel: 201,
      maxLevel: 500,
      badgeStyle: 'diamond',
    };
  return {
    tierName: 'Leyenda',
    tierBand: 'leyenda',
    minLevel: 501,
    maxLevel: null,
    badgeStyle: 'legend_animated',
  };
}
