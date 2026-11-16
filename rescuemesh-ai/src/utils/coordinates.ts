/**
 * Centralized coordinate formatting helpers for RescueMesh.
 * Guarantees GPS precision from hardware is preserved (at least 6 decimal places).
 */

export function formatCoordinate(
  coord: number | string | null | undefined,
  decimals = 6
): string {
  if (coord === null || coord === undefined || coord === '') return '—';
  const num = typeof coord === 'string' ? parseFloat(coord) : coord;
  if (isNaN(num)) return '—';
  return num.toFixed(decimals);
}

export function formatGpsCoordinates(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
  decimals = 6
): string {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return 'Location unavailable';
  }
  const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
  const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;
  if (isNaN(latNum) || isNaN(lngNum)) {
    return 'Location unavailable';
  }
  return `${latNum.toFixed(decimals)}, ${lngNum.toFixed(decimals)}`;
}

export function isValidGps(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined
): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
  const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;
  if (isNaN(latNum) || isNaN(lngNum)) return false;
  return latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180 && (latNum !== 0 || lngNum !== 0);
}
