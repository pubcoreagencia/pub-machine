/**
 * Geometria Geoespacial Pura e Determinística
 * Módulo: Signal / Capture Intelligence V0
 * Sem dependências externas.
 */

import { Coordinates, ZoneGeometry, CircularGeometry, PolygonGeometry } from './geo-signal.types';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Converte graus para radianos.
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Valida se as coordenadas estão dentro dos limites geográficos padrão WGS84.
 */
export function isValidCoordinates(coord: Coordinates): boolean {
  if (!coord || typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
    return false;
  }
  if (isNaN(coord.latitude) || isNaN(coord.longitude)) {
    return false;
  }
  return (
    coord.latitude >= -90 &&
    coord.latitude <= 90 &&
    coord.longitude >= -180 &&
    coord.longitude <= 180
  );
}

/**
 * Calcula a distância geodésica em metros entre dois pontos usando a fórmula de Haversine.
 */
export function calculateHaversineDistanceMeters(a: Coordinates, b: Coordinates): number {
  if (!isValidCoordinates(a) || !isValidCoordinates(b)) {
    throw new Error('Invalid coordinates provided to calculateHaversineDistanceMeters');
  }

  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinDlat2 = Math.sin(dLat / 2);
  const sinDlon2 = Math.sin(dLon / 2);

  const hav =
    sinDlat2 * sinDlat2 +
    Math.cos(lat1) * Math.cos(lat2) * sinDlon2 * sinDlon2;

  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Verifica se um ponto está contido dentro de um círculo geográfico.
 */
export function isPointInCircle(point: Coordinates, circle: CircularGeometry): boolean {
  if (!isValidCoordinates(point) || !isValidCoordinates(circle.center)) {
    return false;
  }
  if (circle.radiusMeters < 0) {
    return false;
  }
  const distance = calculateHaversineDistanceMeters(point, circle.center);
  return distance <= circle.radiusMeters;
}

/**
 * Verifica se um ponto está dentro de um polígono utilizando o algoritmo Ray Casting (Even-Odd rule).
 * Trata latitude como Y e longitude como X em projeção local.
 */
export function isPointInPolygon(point: Coordinates, polygon: PolygonGeometry): boolean {
  if (!isValidCoordinates(point) || !polygon.coordinates || polygon.coordinates.length < 3) {
    return false;
  }

  const vs = polygon.coordinates;
  const x = point.longitude;
  const y = point.latitude;

  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].longitude;
    const yi = vs[i].latitude;
    const xj = vs[j].longitude;
    const yj = vs[j].latitude;

    if (!isValidCoordinates(vs[i]) || !isValidCoordinates(vs[j])) {
      return false;
    }

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Avalia se o ponto está contido na geometria especificada (Círculo ou Polígono).
 */
export function isPointInZoneGeometry(point: Coordinates, geometry: ZoneGeometry): boolean {
  if (geometry.type === 'Circle') {
    return isPointInCircle(point, geometry);
  } else if (geometry.type === 'Polygon') {
    return isPointInPolygon(point, geometry);
  }
  return false;
}
