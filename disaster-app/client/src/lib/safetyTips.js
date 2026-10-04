/** Do and do-not guidance shown when a disaster type is selected. */

export const SAFETY_TIPS = {
  flood: {
    title: 'Flood safety',
    dos: [
      'Move to higher ground before water levels rise',
      'Keep documents, medicines and a power bank in a waterproof bag',
      'Switch off the mains supply if water enters the building',
      'Store drinking water, supply may be contaminated'
    ],
    donts: [
      'Do not walk or drive through moving flood water',
      'Do not touch electrical fittings while standing in water',
      'Do not drink flood water even after boiling',
      'Do not ignore an evacuation instruction'
    ]
  },
  cyclone: {
    title: 'Cyclone safety',
    dos: [
      'Secure windows, doors and loose objects outdoors',
      'Charge phones and keep a battery radio for official updates',
      'Move to a designated cyclone shelter before landfall',
      'Keep three days of food and water ready'
    ],
    donts: [
      'Do not stay in temporary or thatched structures',
      'Do not go outside during the lull, strong winds return',
      'Do not shelter near the coast or under trees',
      'Do not rely only on mobile networks, they may fail'
    ]
  },
  earthquake: {
    title: 'Earthquake safety',
    dos: [
      'Drop, take cover under sturdy furniture and hold on',
      'Stay away from windows, mirrors and heavy objects',
      'Move to open ground away from buildings if already outside',
      'Check for gas leaks and injuries once shaking stops'
    ],
    donts: [
      'Do not run outside while the ground is shaking',
      'Do not use lifts during or after the tremor',
      'Do not light a match if you smell gas',
      'Do not re-enter a visibly damaged building'
    ]
  },
  fire: {
    title: 'Fire safety',
    dos: [
      'Raise the alarm and call the fire service on 101',
      'Stay low to avoid smoke while moving out',
      'Use staircases and feel doors before opening them',
      'Gather at the assembly point for a head count'
    ],
    donts: [
      'Do not return inside for belongings',
      'Do not use lifts during evacuation',
      'Do not open a door that is hot to the touch',
      'Do not use water on an electrical fire'
    ]
  },
  tsunami: {
    title: 'Tsunami safety',
    dos: [
      'Move inland and uphill immediately after a warning',
      'Treat strong coastal shaking as a natural warning',
      'Follow the marked evacuation route on higher roads',
      'Wait for an official all-clear before returning'
    ],
    donts: [
      'Do not go to the shore to watch the waves',
      'Do not wait for a siren if natural signs are present',
      'Do not return after the first wave, more follow',
      'Do not evacuate along low-lying coastal roads'
    ]
  }
};

export function getSafetyTips(disasterType) {
  return SAFETY_TIPS[disasterType] ?? null;
}
