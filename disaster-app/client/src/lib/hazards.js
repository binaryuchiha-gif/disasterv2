/**
 * Hazard zone selection shared by the store and the views.
 * Kept pure so components can memoise on the inputs directly.
 */

/**
 * Returns the hazard zones that are currently in force.
 * When a disaster type is selected only its zones apply, otherwise every
 * active zone is considered.
 */
export function filterActiveHazards(hazards, selectedDisaster) {
  if (!Array.isArray(hazards)) return [];
  return hazards.filter(
    (hazard) => hazard.active && (!selectedDisaster || hazard.disaster_type === selectedDisaster)
  );
}

export default filterActiveHazards;
