import { getMapDefinition, type MapId } from '../../map-config';

export function getSpawnPositions(mapId: MapId): Array<{ x: number; z: number }> {
  const def = getMapDefinition(mapId);
  return [def.spawns[0], def.spawns[1]];
}
