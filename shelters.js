/*
  shelters.js
  Static demo data for the Disaster Management Web App.
  Exposes a single global object: DISASTER_DATA
  Edit the arrays below to add or change shelters and hazard zones.
*/

(function (global) {
  "use strict";

  // ---------------------------------------------------------------------
  // Shelters: 15 locations around Chennai
  // facilities values used: water, food, medical, power, toilets, bedding
  // ---------------------------------------------------------------------
  var SHELTERS = [
    {
      id: "sh01",
      name: "Chennai Corporation School, Marina",
      lat: 13.0520,
      lng: 80.2800,
      capacity: 300,
      occupied: 120,
      facilities: ["water", "food", "toilets", "power"],
      phone: "04423456001",
      type: "school",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh02",
      name: "Panagal Park Community Hall, T Nagar",
      lat: 13.0410,
      lng: 80.2340,
      capacity: 250,
      occupied: 240,
      facilities: ["water", "toilets", "medical"],
      phone: "04423456002",
      type: "community_hall",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh03",
      name: "Anna Nagar Tower Park Community Center",
      lat: 13.0850,
      lng: 80.2101,
      capacity: 400,
      occupied: 60,
      facilities: ["water", "food", "power", "toilets", "bedding"],
      phone: "04423456003",
      type: "community_hall",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh04",
      name: "Jawaharlal Nehru Stadium, Periamet",
      lat: 13.0756,
      lng: 80.2659,
      capacity: 1000,
      occupied: 300,
      facilities: ["water", "food", "medical", "power", "toilets", "bedding"],
      phone: "04423456004",
      type: "stadium",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh05",
      name: "Egmore Government Hall",
      lat: 13.0732,
      lng: 80.2609,
      capacity: 200,
      occupied: 200,
      facilities: ["water", "toilets"],
      phone: "04423456005",
      type: "government_building",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh06",
      name: "Velachery Government School",
      lat: 12.9815,
      lng: 80.2176,
      capacity: 350,
      occupied: 90,
      facilities: ["water", "food", "toilets", "power"],
      phone: "04423456006",
      type: "school",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh07",
      name: "Adyar Community Hall",
      lat: 13.0067,
      lng: 80.2206,
      capacity: 220,
      occupied: 40,
      facilities: ["water", "toilets", "medical"],
      phone: "04423456007",
      type: "community_hall",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh08",
      name: "Besant Nagar Panchayat Hall",
      lat: 13.0002,
      lng: 80.2669,
      capacity: 180,
      occupied: 20,
      facilities: ["water", "food", "toilets"],
      phone: "04423456008",
      type: "government_building",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh09",
      name: "Tambaram Government Hospital Hall",
      lat: 12.9249,
      lng: 80.1000,
      capacity: 300,
      occupied: 150,
      facilities: ["water", "food", "medical", "power", "toilets"],
      phone: "04423456009",
      type: "government_building",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh10",
      name: "Perambur Railway Institute",
      lat: 13.1143,
      lng: 80.2329,
      capacity: 260,
      occupied: 10,
      facilities: ["water", "toilets", "power", "bedding"],
      phone: "04423456010",
      type: "community_hall",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh11",
      name: "Royapuram Government School",
      lat: 13.1143,
      lng: 80.2924,
      capacity: 240,
      occupied: 230,
      facilities: ["water", "toilets"],
      phone: "04423456011",
      type: "school",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh12",
      name: "Ennore Government Higher Secondary School",
      lat: 13.2146,
      lng: 80.3340,
      capacity: 300,
      occupied: 50,
      facilities: ["water", "food", "toilets", "power"],
      phone: "04423456012",
      type: "school",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh13",
      name: "Vadapalani Murugan Temple Hall",
      lat: 13.0504,
      lng: 80.2129,
      capacity: 150,
      occupied: 30,
      facilities: ["water", "food", "toilets"],
      phone: "04423456013",
      type: "community_hall",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh14",
      name: "Kodambakkam Government School",
      lat: 13.0524,
      lng: 80.2225,
      capacity: 280,
      occupied: 70,
      facilities: ["water", "food", "medical", "toilets"],
      phone: "04423456014",
      type: "school",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    },
    {
      id: "sh15",
      name: "Washermanpet Community Center",
      lat: 13.1167,
      lng: 80.2833,
      capacity: 200,
      occupied: 0,
      facilities: ["water", "toilets", "power"],
      phone: "04423456015",
      type: "community_hall",
      lastUpdated: "2026-10-04T06:00:00+05:30"
    }
  ];

  // ---------------------------------------------------------------------
  // Hazard zones per disaster type.
  // type: "circle" -> { center: [lat, lng], radiusMeters }
  // type: "polygon" -> { points: [[lat, lng], ...] }
  // ---------------------------------------------------------------------
  var HAZARD_ZONES = {
    flood: [
      {
        id: "hz-flood-adyar",
        name: "Adyar River flood belt",
        type: "polygon",
        points: [
          [13.0120, 80.2340],
          [13.0080, 80.2420],
          [12.9980, 80.2460],
          [12.9930, 80.2380],
          [13.0000, 80.2280],
          [13.0080, 80.2260]
        ]
      },
      {
        id: "hz-flood-velachery",
        name: "Velachery low-lying zone",
        type: "circle",
        center: [12.9815, 80.2206],
        radiusMeters: 1800
      },
      {
        id: "hz-flood-ennore",
        name: "Ennore creek flood zone",
        type: "circle",
        center: [13.2100, 80.3250],
        radiusMeters: 1500
      }
    ],
    cyclone: [
      {
        id: "hz-cyclone-marina",
        name: "Marina coastal cyclone belt",
        type: "polygon",
        points: [
          [13.0620, 80.2850],
          [13.0520, 80.2900],
          [13.0300, 80.2850],
          [13.0200, 80.2800],
          [13.0300, 80.2750],
          [13.0520, 80.2780]
        ]
      },
      {
        id: "hz-cyclone-ennore",
        name: "Ennore coastal cyclone belt",
        type: "circle",
        center: [13.2146, 80.3400],
        radiusMeters: 2500
      }
    ],
    earthquake: [
      {
        id: "hz-eq-city",
        name: "Older building stock zone, central Chennai",
        type: "circle",
        center: [13.0732, 80.2609],
        radiusMeters: 2200
      },
      {
        id: "hz-eq-tnagar",
        name: "Dense construction zone, T Nagar",
        type: "circle",
        center: [13.0410, 80.2340],
        radiusMeters: 1200
      }
    ],
    fire: [
      {
        id: "hz-fire-ennore",
        name: "Ennore industrial fire risk zone",
        type: "circle",
        center: [13.2146, 80.3340],
        radiusMeters: 1600
      },
      {
        id: "hz-fire-perambur",
        name: "Perambur industrial fire risk zone",
        type: "circle",
        center: [13.1143, 80.2329],
        radiusMeters: 1000
      }
    ],
    tsunami: [
      {
        id: "hz-tsunami-marina",
        name: "Marina Beach tsunami inundation zone",
        type: "polygon",
        points: [
          [13.0620, 80.2870],
          [13.0500, 80.2910],
          [13.0300, 80.2870],
          [13.0150, 80.2830],
          [13.0150, 80.2770],
          [13.0400, 80.2800],
          [13.0600, 80.2820]
        ]
      },
      {
        id: "hz-tsunami-besant",
        name: "Besant Nagar tsunami inundation zone",
        type: "circle",
        center: [13.0002, 80.2720],
        radiusMeters: 1200
      },
      {
        id: "hz-tsunami-ennore",
        name: "Ennore coast tsunami inundation zone",
        type: "circle",
        center: [13.2160, 80.3400],
        radiusMeters: 1800
      }
    ]
  };

  // ---------------------------------------------------------------------
  // Safety tips per disaster type (do / dont)
  // ---------------------------------------------------------------------
  var SAFETY_TIPS = {
    flood: {
      title: "Flood safety",
      dos: [
        "Move to higher ground as early as possible",
        "Keep drinking water, documents, and medicines in a waterproof bag",
        "Switch off mains power if water is entering the building",
        "Follow official shelter directions and updates"
      ],
      donts: [
        "Do not walk or drive through moving flood water",
        "Do not touch electrical equipment while wet or standing in water",
        "Do not drink flood water, even if boiled",
        "Do not ignore evacuation orders from local authorities"
      ]
    },
    cyclone: {
      title: "Cyclone safety",
      dos: [
        "Secure loose objects, windows, and doors",
        "Store several days of food, water, and charged power banks",
        "Move to the nearest shelter before the cyclone makes landfall",
        "Keep a battery or hand-crank radio for official updates"
      ],
      donts: [
        "Do not stay near the coast or in temporary structures",
        "Do not go outside during the eye of the storm, more wind follows",
        "Do not use candles if gas leaks are possible",
        "Do not rely on mobile networks alone, they may fail"
      ]
    },
    earthquake: {
      title: "Earthquake safety",
      dos: [
        "Drop, cover, and hold on under sturdy furniture",
        "Stay away from windows, mirrors, and heavy hanging objects",
        "After shaking stops, check for injuries and gas leaks",
        "Move to open ground away from buildings if outdoors"
      ],
      donts: [
        "Do not run outside during shaking",
        "Do not use elevators",
        "Do not light a match if you smell gas",
        "Do not re-enter damaged buildings"
      ]
    },
    fire: {
      title: "Fire safety",
      dos: [
        "Alert others and call the fire service immediately",
        "Stay low to the ground to avoid smoke inhalation",
        "Use stairs, never elevators, during evacuation",
        "Feel doors before opening, they may be hot"
      ],
      donts: [
        "Do not go back inside for belongings",
        "Do not open hot doors",
        "Do not use water on an electrical fire",
        "Do not hide in a closet or under a bed"
      ]
    },
    tsunami: {
      title: "Tsunami safety",
      dos: [
        "Move inland and to higher ground immediately after a warning",
        "Treat strong coastal shaking as a natural tsunami warning",
        "Stay away from the coast until authorities confirm it is safe",
        "Help others move to higher ground if possible"
      ],
      donts: [
        "Do not go to the beach to watch waves",
        "Do not wait for an official siren if natural signs are present",
        "Do not return to the coast too soon, waves arrive in series",
        "Do not use low-lying roads near the coast to evacuate"
      ]
    }
  };

  global.DISASTER_DATA = {
    shelters: SHELTERS,
    hazardZones: HAZARD_ZONES,
    safetyTips: SAFETY_TIPS
  };
})(typeof window !== "undefined" ? window : this);
