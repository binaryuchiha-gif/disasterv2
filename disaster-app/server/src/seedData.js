/**
 * Seed dataset for the demonstration environment.
 *
 * Kept free of database and crypto imports so the data can be validated and
 * reused independently of the seeding process.
 */

/** Builds a closed GeoJSON polygon from [lng, lat] pairs. */
export function polygon(ring) {
  const closed = [...ring];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    closed.push(first);
  }
  return { type: 'Polygon', coordinates: [closed] };
}

export const USERS = [
  {
    id: 1,
    name: 'District Administrator',
    email: 'admin@demo.com',
    password: 'Admin@123',
    role: 'admin'
  },
  {
    id: 2,
    name: 'Relief Volunteer',
    email: 'volunteer@demo.com',
    password: 'Volunteer@123',
    role: 'volunteer'
  }
];

export const SHELTERS = [
  {
    id: 1,
    name: 'Chennai Higher Secondary School, Triplicane',
    type: 'school',
    lat: 13.0569,
    lng: 80.2766,
    address: 'Triplicane High Road, Triplicane, Chennai 600005',
    capacity: 320,
    occupied: 148,
    phone: '04428440101',
    facilities: ['water', 'food', 'toilets', 'power'],
    accessibility: 1
  },
  {
    id: 2,
    name: 'Jawaharlal Nehru Indoor Stadium',
    type: 'stadium',
    lat: 13.0732,
    lng: 80.2609,
    address: 'Sydenhams Road, Periamet, Chennai 600003',
    capacity: 1200,
    occupied: 410,
    phone: '04425380102',
    facilities: ['water', 'food', 'medical', 'power', 'toilets', 'bedding'],
    accessibility: 1
  },
  {
    id: 3,
    name: 'Anna Nagar Community Hall',
    type: 'community_hall',
    lat: 13.0876,
    lng: 80.2101,
    address: '2nd Avenue, Anna Nagar, Chennai 600040',
    capacity: 400,
    occupied: 92,
    phone: '04426210103',
    facilities: ['water', 'food', 'power', 'toilets', 'bedding'],
    accessibility: 1
  },
  {
    id: 4,
    name: 'Corporation Middle School, Mylapore',
    type: 'school',
    lat: 13.0339,
    lng: 80.2619,
    address: 'Kutchery Road, Mylapore, Chennai 600004',
    capacity: 260,
    occupied: 240,
    phone: '04424640104',
    facilities: ['water', 'toilets', 'medical'],
    accessibility: 0
  },
  {
    id: 5,
    name: 'Velachery Government Girls School',
    type: 'school',
    lat: 12.9815,
    lng: 80.2176,
    address: '100 Feet Road, Velachery, Chennai 600042',
    capacity: 380,
    occupied: 118,
    phone: '04422430105',
    facilities: ['water', 'food', 'toilets', 'power'],
    accessibility: 1
  },
  {
    id: 6,
    name: 'Adyar Community Welfare Centre',
    type: 'community_hall',
    lat: 13.0067,
    lng: 80.2566,
    address: 'Sardar Patel Road, Adyar, Chennai 600020',
    capacity: 240,
    occupied: 54,
    phone: '04424910106',
    facilities: ['water', 'toilets', 'medical', 'power'],
    accessibility: 1
  },
  {
    id: 7,
    name: 'Besant Nagar Cyclone Shelter',
    type: 'cyclone_shelter',
    lat: 13.0002,
    lng: 80.2669,
    address: '4th Main Road, Besant Nagar, Chennai 600090',
    capacity: 300,
    occupied: 36,
    phone: '04424460107',
    facilities: ['water', 'food', 'toilets', 'power', 'bedding'],
    accessibility: 1
  },
  {
    id: 8,
    name: 'Ennore Government Higher Secondary School',
    type: 'school',
    lat: 13.2146,
    lng: 80.3234,
    address: 'Ennore High Road, Ennore, Chennai 600057',
    capacity: 340,
    occupied: 76,
    phone: '04425730108',
    facilities: ['water', 'food', 'toilets', 'power'],
    accessibility: 0
  },
  {
    id: 9,
    name: 'Royapuram Fishermen Community Hall',
    type: 'community_hall',
    lat: 13.1067,
    lng: 80.2944,
    address: 'Beach Road, Royapuram, Chennai 600013',
    capacity: 220,
    occupied: 220,
    phone: '04425950109',
    facilities: ['water', 'toilets'],
    accessibility: 0
  },
  {
    id: 10,
    name: 'Perambur Railway Institute Hall',
    type: 'government_building',
    lat: 13.1143,
    lng: 80.2329,
    address: 'Paper Mills Road, Perambur, Chennai 600011',
    capacity: 280,
    occupied: 44,
    phone: '04426710110',
    facilities: ['water', 'toilets', 'power', 'bedding'],
    accessibility: 1
  },
  {
    id: 11,
    name: 'Tambaram Taluk Office Relief Centre',
    type: 'government_building',
    lat: 12.9249,
    lng: 80.1,
    address: 'Gandhi Road, Tambaram, Chennai 600045',
    capacity: 320,
    occupied: 160,
    phone: '04422260111',
    facilities: ['water', 'food', 'medical', 'power', 'toilets'],
    accessibility: 1
  },
  {
    id: 12,
    name: 'Pallikaranai Panchayat Union School',
    type: 'school',
    lat: 12.9378,
    lng: 80.2103,
    address: 'Medavakkam Main Road, Pallikaranai, Chennai 600100',
    capacity: 260,
    occupied: 88,
    phone: '04422470112',
    facilities: ['water', 'toilets', 'power'],
    accessibility: 0
  },
  {
    id: 13,
    name: 'Kodambakkam Corporation School',
    type: 'school',
    lat: 13.0524,
    lng: 80.2225,
    address: 'Arcot Road, Kodambakkam, Chennai 600024',
    capacity: 300,
    occupied: 96,
    phone: '04423720113',
    facilities: ['water', 'food', 'medical', 'toilets'],
    accessibility: 1
  },
  {
    id: 14,
    name: 'Washermanpet Community Centre',
    type: 'community_hall',
    lat: 13.1167,
    lng: 80.2833,
    address: 'Thiruvottiyur High Road, Washermanpet, Chennai 600021',
    capacity: 210,
    occupied: 0,
    phone: '04425960114',
    facilities: ['water', 'toilets', 'power'],
    accessibility: 0
  },
  {
    id: 15,
    name: 'Thiruvanmiyur Government Boys School',
    type: 'school',
    lat: 12.983,
    lng: 80.2594,
    address: 'East Coast Road, Thiruvanmiyur, Chennai 600041',
    capacity: 290,
    occupied: 104,
    phone: '04424410115',
    facilities: ['water', 'food', 'toilets', 'power'],
    accessibility: 1
  },
  {
    id: 16,
    name: 'Mahabalipuram Coastal Cyclone Shelter',
    type: 'cyclone_shelter',
    lat: 12.6208,
    lng: 80.1945,
    address: 'East Coast Road, Mahabalipuram, Chengalpattu 603104',
    capacity: 260,
    occupied: 48,
    phone: '04427442116',
    facilities: ['water', 'food', 'toilets', 'power', 'bedding'],
    accessibility: 1
  },
  {
    id: 17,
    name: 'Kelambakkam Government Hospital Hall',
    type: 'government_building',
    lat: 12.7925,
    lng: 80.2208,
    address: 'Vandalur Kelambakkam Road, Kelambakkam 603103',
    capacity: 240,
    occupied: 120,
    phone: '04427470117',
    facilities: ['water', 'medical', 'power', 'toilets'],
    accessibility: 1
  },
  {
    id: 18,
    name: 'Ponneri Taluk Community Hall',
    type: 'community_hall',
    lat: 13.3298,
    lng: 80.1945,
    address: 'Grand North Trunk Road, Ponneri, Tiruvallur 601204',
    capacity: 230,
    occupied: 62,
    phone: '04427970118',
    facilities: ['water', 'food', 'toilets'],
    accessibility: 0
  },
  {
    id: 19,
    name: 'Avadi Municipal Higher Secondary School',
    type: 'school',
    lat: 13.1147,
    lng: 80.1098,
    address: 'Thirumullaivoyal Road, Avadi, Chennai 600054',
    capacity: 350,
    occupied: 132,
    phone: '04426550119',
    facilities: ['water', 'food', 'toilets', 'power', 'bedding'],
    accessibility: 1
  },
  {
    id: 20,
    name: 'Nemmeli Coastal Relief Centre',
    type: 'cyclone_shelter',
    lat: 12.7372,
    lng: 80.2436,
    address: 'East Coast Road, Nemmeli, Chengalpattu 603104',
    capacity: 180,
    occupied: 176,
    phone: '04427440120',
    facilities: ['water', 'toilets'],
    accessibility: 0
  }
];

export const HAZARD_ZONES = [
  {
    id: 1,
    disaster_type: 'flood',
    name: 'Adyar river flood plain',
    severity: 3,
    active: 1,
    geojson: polygon([
      [80.2284, 13.0129],
      [80.2422, 13.0098],
      [80.2515, 13.0042],
      [80.247, 12.9972],
      [80.2335, 13.0004],
      [80.2262, 13.0062]
    ])
  },
  {
    id: 2,
    disaster_type: 'flood',
    name: 'Cooum river overflow corridor',
    severity: 2,
    active: 1,
    geojson: polygon([
      [80.2185, 13.0772],
      [80.2454, 13.074],
      [80.2666, 13.0715],
      [80.265, 13.0662],
      [80.2432, 13.0686],
      [80.2178, 13.0719]
    ])
  },
  {
    id: 3,
    disaster_type: 'flood',
    name: 'Velachery and Pallikaranai low-lying basin',
    severity: 3,
    active: 1,
    geojson: polygon([
      [80.1972, 12.9892],
      [80.2208, 12.9916],
      [80.2286, 12.9742],
      [80.2174, 12.9566],
      [80.1958, 12.9648],
      [80.1912, 12.9788]
    ])
  },
  {
    id: 4,
    disaster_type: 'flood',
    name: 'Ennore creek backwater zone',
    severity: 2,
    active: 1,
    geojson: polygon([
      [80.3098, 13.2254],
      [80.3322, 13.2228],
      [80.3366, 13.2074],
      [80.3214, 13.1992],
      [80.3062, 13.2088]
    ])
  },
  {
    id: 5,
    disaster_type: 'cyclone',
    name: 'Marina coastal wind corridor',
    severity: 3,
    active: 1,
    geojson: polygon([
      [80.2782, 13.0662],
      [80.2914, 13.0638],
      [80.2886, 13.0242],
      [80.2744, 13.0266],
      [80.2758, 13.0468]
    ])
  },
  {
    id: 6,
    disaster_type: 'cyclone',
    name: 'Ennore and Kattupalli port exposure belt',
    severity: 3,
    active: 1,
    geojson: polygon([
      [80.3244, 13.2612],
      [80.3488, 13.2588],
      [80.3454, 13.1998],
      [80.3218, 13.2032]
    ])
  },
  {
    id: 7,
    disaster_type: 'cyclone',
    name: 'East Coast Road landfall corridor',
    severity: 2,
    active: 1,
    geojson: polygon([
      [80.2402, 12.7698],
      [80.2588, 12.7662],
      [80.2176, 12.6122],
      [80.1958, 12.6168]
    ])
  },
  {
    id: 8,
    disaster_type: 'tsunami',
    name: 'Marina Beach inundation line',
    severity: 3,
    active: 1,
    geojson: polygon([
      [80.2822, 13.0668],
      [80.2938, 13.0648],
      [80.2908, 13.0188],
      [80.2792, 13.0212]
    ])
  },
  {
    id: 9,
    disaster_type: 'tsunami',
    name: 'Besant Nagar and Thiruvanmiyur shoreline',
    severity: 2,
    active: 1,
    geojson: polygon([
      [80.2688, 13.0062],
      [80.2802, 13.0042],
      [80.2752, 12.9772],
      [80.2638, 12.9796]
    ])
  },
  {
    id: 10,
    disaster_type: 'earthquake',
    name: 'Central Chennai older building stock',
    severity: 1,
    active: 1,
    geojson: polygon([
      [80.2512, 13.0842],
      [80.2772, 13.0818],
      [80.2738, 13.0552],
      [80.2488, 13.0578]
    ])
  },
  {
    id: 11,
    disaster_type: 'fire',
    name: 'Manali petrochemical industrial cluster',
    severity: 3,
    active: 1,
    geojson: polygon([
      [80.2558, 13.1702],
      [80.2822, 13.1678],
      [80.2788, 13.1452],
      [80.2528, 13.1476]
    ])
  },
  {
    id: 12,
    disaster_type: 'fire',
    name: 'Ennore thermal and storage yard',
    severity: 2,
    active: 1,
    geojson: polygon([
      [80.3098, 13.2312],
      [80.3288, 13.2292],
      [80.3262, 13.2128],
      [80.3072, 13.2148]
    ])
  }
];

export const CONTACTS = [
  { id: 1, label: 'National Emergency Number', number: '112', category: 'national' },
  { id: 2, label: 'Police', number: '100', category: 'police' },
  { id: 3, label: 'Fire and Rescue Service', number: '101', category: 'fire' },
  { id: 4, label: 'Ambulance', number: '102', category: 'medical' },
  { id: 5, label: 'Emergency Medical Services', number: '108', category: 'medical' },
  { id: 6, label: 'State Disaster Management Helpline', number: '1070', category: 'disaster' },
  { id: 7, label: 'District Disaster Control Room', number: '1077', category: 'disaster' },
  {
    id: 8,
    label: 'National Disaster Response Force',
    number: '01124363260',
    category: 'disaster'
  }
];

export const ALERTS = [
  {
    id: 1,
    title: 'Heavy rainfall advisory for coastal districts',
    body: 'The regional forecast indicates heavy rainfall over the next 24 hours. Residents in low-lying areas should prepare to move to higher ground.',
    severity: 'warning',
    disaster_type: 'flood',
    created_by: 1
  },
  {
    id: 2,
    title: 'High tide advisory for fishing communities',
    body: 'Fishermen are advised not to venture into the sea until further notice. Secure boats and equipment above the high tide line.',
    severity: 'warning',
    disaster_type: 'cyclone',
    created_by: 1
  },
  {
    id: 3,
    title: 'Civil defence drill scheduled',
    body: 'A routine evacuation drill will be conducted in North Chennai this week. Follow volunteer instructions at assembly points.',
    severity: 'info',
    disaster_type: null,
    created_by: 1
  }
];

export const REPORTS = [
  {
    id: 1,
    type: 'flooded_area',
    lat: 13.0121,
    lng: 80.2338,
    description: 'Water above knee level near the Adyar bridge approach road.',
    upvotes: 6,
    downvotes: 1,
    status: 'verified'
  },
  {
    id: 2,
    type: 'road_blocked',
    lat: 13.0742,
    lng: 80.2431,
    description: 'Fallen tree blocking one lane close to the Cooum crossing.',
    upvotes: 4,
    downvotes: 0,
    status: 'verified'
  },
  {
    id: 3,
    type: 'medical_help',
    lat: 12.9822,
    lng: 80.2188,
    description: 'Elderly resident needs assistance reaching the Velachery shelter.',
    upvotes: 2,
    downvotes: 0,
    status: 'unverified'
  },
  {
    id: 4,
    type: 'food_water',
    lat: 13.1072,
    lng: 80.2938,
    description: 'Drinking water supply needed at the Royapuram community hall.',
    upvotes: 1,
    downvotes: 0,
    status: 'unverified'
  }
];

export const SOS_EVENTS = [
  {
    id: 1,
    name: 'Resident report',
    phone: '9840012345',
    lat: 13.0456,
    lng: 80.2712,
    message: 'Family of four stranded on the first floor, water rising.',
    status: 'resolved'
  }
];
