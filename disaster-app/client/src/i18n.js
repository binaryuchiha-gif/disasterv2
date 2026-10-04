/** Interface translations for English, Tamil and Hindi. */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { STORAGE_KEYS } from './lib/constants.js';
import { readString, writeString } from './lib/storage.js';

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ta', label: 'Tamil', short: 'TA' },
  { code: 'hi', label: 'Hindi', short: 'HI' }
];

const en = {
  app: { name: 'Disaster Management', shortName: 'Disaster App' },
  nav: {
    map: 'Map',
    shelters: 'Shelters',
    reports: 'Reports',
    contacts: 'Contacts',
    checkin: 'Check-in',
    admin: 'Admin',
    login: 'Sign in',
    logout: 'Sign out'
  },
  status: {
    online: 'Online',
    offline: 'Offline',
    live: 'Live',
    disconnected: 'Disconnected',
    gpsActive: 'GPS active',
    gpsSearching: 'GPS searching',
    gpsDenied: 'GPS denied',
    gpsDemo: 'Demo location'
  },
  disaster: {
    flood: 'Flood',
    cyclone: 'Cyclone',
    earthquake: 'Earthquake',
    fire: 'Fire',
    tsunami: 'Tsunami'
  },
  location: {
    title: 'Find shelters near you',
    body: 'Your location is used to rank nearby shelters and plan a safe route. It stays on this device and is never sent to a third party.',
    enable: 'Enable location',
    demo: 'Use demo location',
    locateMe: 'Locate me',
    followOn: 'Following your position',
    followOff: 'Follow position'
  },
  shelters: {
    title: 'Nearest shelters',
    findSafest: 'Find safest shelter',
    recommended: 'Recommended',
    capacity: 'Capacity',
    free: 'free',
    available: 'Space available',
    limited: 'Limited space',
    full: 'At capacity',
    closed: 'Closed',
    updated: 'Updated',
    why: 'Why this shelter',
    facilities: 'Facilities',
    empty: 'No open shelters match the current filters.',
    accessible: 'Step-free access'
  },
  route: {
    title: 'Route',
    hazardAvoiding: 'Hazard-avoiding route',
    crossesHazard: 'Route crosses a hazard zone',
    estimated: 'Estimated',
    openInMaps: 'Open in Google Maps',
    steps: 'Turn-by-turn directions',
    distance: 'Distance',
    eta: 'Estimated time',
    noSteps: 'Detailed directions are unavailable for this estimate.'
  },
  sos: {
    button: 'SOS',
    hold: 'Hold for 2 seconds',
    sending: 'Sending',
    sent: 'Emergency request recorded',
    reference: 'Reference',
    queued: 'Saved on this device and will be sent when you are back online.',
    share: 'Share',
    copy: 'Copy',
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    viewOnMap: 'View on map'
  },
  reports: {
    title: 'Community reports',
    submit: 'Submit report',
    description: 'Description',
    type: 'Situation',
    verified: 'Verified',
    unverified: 'Unverified',
    rejected: 'Rejected',
    empty: 'No reports have been submitted yet.',
    helpful: 'Confirm',
    notHelpful: 'Dispute',
    road_blocked: 'Road blocked',
    flooded_area: 'Flooded area',
    medical_help: 'Medical help needed',
    food_water: 'Food or water needed',
    person_missing: 'Person missing',
    power_outage: 'Power outage'
  },
  contacts: {
    title: 'Emergency contacts',
    call: 'Call',
    personal: 'Personal contacts',
    addPersonal: 'Add contact',
    name: 'Name',
    number: 'Number',
    empty: 'No personal contacts saved on this device.'
  },
  checkin: {
    title: 'Family check-in',
    safe: 'I am safe',
    yourName: 'Your name',
    message: 'Message',
    lookup: 'Look up a name',
    search: 'Search',
    recent: 'Recent check-ins',
    empty: 'No check-ins found.',
    shareText: 'Share this update'
  },
  alerts: { title: 'Alerts', none: 'No active alerts.', history: 'Alert history' },
  weather: {
    title: 'Weather and flood risk',
    rainNow: 'Rain now',
    rain24h: 'Rain next 24 h',
    wind: 'Wind',
    riskLow: 'Low risk',
    riskModerate: 'Moderate risk',
    riskHigh: 'High risk',
    riskSevere: 'Severe risk',
    riskUnknown: 'Risk unknown',
    unavailable: 'Weather data is unavailable.'
  },
  earthquakes: {
    title: 'Recent earthquakes',
    magnitude: 'Magnitude',
    depth: 'Depth',
    empty: 'No recent earthquakes in this region.'
  },
  admin: {
    title: 'Authority dashboard',
    openSos: 'Open SOS',
    sheltersOpen: 'Shelters open',
    occupancy: 'Total occupancy',
    activeReports: 'Active reports',
    sosOverTime: 'SOS requests, last 24 hours',
    occupancyPerShelter: 'Occupancy by shelter',
    reportsByType: 'Reports by type',
    liveSos: 'Live SOS requests',
    shelterManagement: 'Shelter management',
    hazardZones: 'Hazard zones',
    composeAlert: 'Publish an alert',
    moderation: 'Report moderation',
    simulate: 'Simulate disaster',
    acknowledge: 'Acknowledge',
    resolve: 'Resolve',
    addByMap: 'Click the map to add a shelter',
    connected: 'Realtime connected',
    clients: 'connected clients'
  },
  auth: {
    title: 'Sign in',
    subtitle: 'Authority and volunteer access',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    demoCredentials: 'Demonstration credentials',
    adminOnly: 'This area requires an administrator account.'
  },
  traffic: {
    toggle: 'Traffic layer',
    legend: 'Traffic',
    simulated: 'Simulated',
    simulatedHint:
      'No traffic provider key is configured, so this layer is generated locally for demonstration.',
    incidents: 'incidents',
    closures: 'closures',
    delay: 'Delay due to traffic: {{minutes}} min',
    aware: 'Travel time includes live traffic',
    level: {
      free: 'Free flow',
      slow: 'Slow',
      heavy: 'Heavy',
      blocked: 'Blocked'
    }
  },
  radar: {
    toggle: 'Rain radar',
    frame: 'Radar frame',
    forecast: 'forecast',
    unavailable: 'Rain radar is unavailable.'
  },
  risk: {
    title: 'Location risk',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    showFactors: 'Show contributing factors',
    hideFactors: 'Hide contributing factors'
  },
  evacuation: {
    title: 'Evacuation mode',
    start: 'Start evacuation mode',
    needRoute: 'Choose a shelter and plan a route first.',
    continue: 'Continue ahead',
    arrived: 'You have arrived',
    offRoute: 'Return to the route',
    offRouteBadge: 'Off route',
    rerouting: 'Recalculating',
    rerouted: 'New route calculated',
    recalculate: 'Recalculate',
    waitingForLocation: 'Waiting for your location',
    heading: 'Heading to',
    remaining: 'Remaining',
    eta: 'Time left',
    step: 'Step',
    noSteps: 'No detailed steps available',
    voiceOn: 'Turn voice guidance on',
    voiceOff: 'Turn voice guidance off'
  },
  qr: {
    title: 'Arrival code',
    pageTitle: 'Shelter arrival check-in',
    pageSubtitle: 'Confirm how many people are arriving so occupancy stays accurate.',
    partySize: 'People arriving',
    confirm: 'Record arrival',
    recorded: 'Arrival recorded',
    recordedDetail: 'Recorded {{people}} arriving at {{name}}.',
    disclaimer: 'This updates the shelter occupancy shown to everyone using the app.',
    notFound: 'This shelter could not be found.',
    badLink: 'This check-in link is not valid.',
    backToMap: 'Back to the map',
    capacityLine: '{{free}} of {{capacity}} places free',
    instruction: 'Scan on arrival to record your place at this shelter.',
    noAddress: 'Address not recorded',
    adminTitle: 'Arrival QR codes',
    adminHint: 'Print these and display them at each shelter entrance.',
    showCodes: 'Show codes',
    hideCodes: 'Hide codes'
  },
  report: {
    title: 'Situation report',
    print: 'Print',
    generated: 'Generated',
    scope: 'Prepared from live operational data held by this deployment.',
    overview: 'Overview',
    shelterStatus: 'Shelter status',
    activeHazards: 'Active hazard zones',
    outstandingSos: 'Outstanding SOS requests',
    communityReports: 'Community reports',
    backToDashboard: 'Back to the dashboard',
    totalCapacity: 'Total capacity',
    placesFree: 'Places free',
    sosResolved: 'SOS resolved',
    shelter: 'Shelter',
    occupied: 'Occupied',
    free: 'Free',
    status: 'Status',
    zone: 'Zone',
    severity: 'Severity',
    location: 'Location',
    received: 'Received',
    votes: 'Net votes',
    none: 'None recorded',
    footer: 'Generated by the disaster management platform for operational use.'
  },
  map: {
    showLiveData: 'Show live data',
    hideLiveData: 'Hide live data',
    needLocation: 'Enable location or choose the demo location first.',
    needLocationRoute: 'A location is required to plan a route.',
    routeFailed: 'The route could not be planned.'
  },
  common: {
    loading: 'Loading',
    retry: 'Retry',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving',
    dos: 'Do',
    donts: 'Do not',
    safetyTips: 'Safety guidance',
    error: 'Something went wrong',
    none: 'None'
  }
};

const ta = {
  app: { name: 'பேரிடர் மேலாண்மை', shortName: 'பேரிடர் செயலி' },
  nav: {
    map: 'வரைபடம்',
    shelters: 'தங்குமிடங்கள்',
    reports: 'அறிக்கைகள்',
    contacts: 'தொடர்புகள்',
    checkin: 'பாதுகாப்பு தகவல்',
    admin: 'நிர்வாகம்',
    login: 'உள்நுழை',
    logout: 'வெளியேறு'
  },
  status: {
    online: 'இணைப்பில்',
    offline: 'இணைப்பு இல்லை',
    live: 'நேரலை',
    disconnected: 'துண்டிக்கப்பட்டது',
    gpsActive: 'GPS செயலில்',
    gpsSearching: 'GPS தேடுகிறது',
    gpsDenied: 'GPS மறுக்கப்பட்டது',
    gpsDemo: 'மாதிரி இடம்'
  },
  disaster: {
    flood: 'வெள்ளம்',
    cyclone: 'புயல்',
    earthquake: 'நிலநடுக்கம்',
    fire: 'தீ விபத்து',
    tsunami: 'சுனாமி'
  },
  location: {
    title: 'அருகிலுள்ள தங்குமிடங்களைக் கண்டறியுங்கள்',
    body: 'அருகிலுள்ள தங்குமிடங்களை தரவரிசைப்படுத்தவும் பாதுகாப்பான பாதையைத் திட்டமிடவும் உங்கள் இருப்பிடம் பயன்படுத்தப்படுகிறது. இது இந்த சாதனத்தில் மட்டுமே இருக்கும்.',
    enable: 'இருப்பிடத்தை இயக்கு',
    demo: 'மாதிரி இடத்தைப் பயன்படுத்து',
    locateMe: 'என்னைக் கண்டுபிடி',
    followOn: 'உங்கள் இருப்பிடத்தைப் பின்தொடர்கிறது',
    followOff: 'இருப்பிடத்தைப் பின்தொடர்'
  },
  shelters: {
    title: 'அருகிலுள்ள தங்குமிடங்கள்',
    findSafest: 'பாதுகாப்பான தங்குமிடத்தைக் கண்டறி',
    recommended: 'பரிந்துரைக்கப்படுகிறது',
    capacity: 'கொள்ளளவு',
    free: 'காலியாக',
    available: 'இடம் உள்ளது',
    limited: 'குறைந்த இடம்',
    full: 'நிரம்பியது',
    closed: 'மூடப்பட்டது',
    updated: 'புதுப்பிக்கப்பட்டது',
    why: 'இந்த தங்குமிடம் ஏன்',
    facilities: 'வசதிகள்',
    empty: 'தற்போதைய வடிகட்டிகளுக்கு பொருந்தும் தங்குமிடம் இல்லை.',
    accessible: 'படிக்கட்டு இல்லாத அணுகல்'
  },
  route: {
    title: 'பாதை',
    hazardAvoiding: 'ஆபத்தைத் தவிர்க்கும் பாதை',
    crossesHazard: 'பாதை ஆபத்து பகுதியைக் கடக்கிறது',
    estimated: 'மதிப்பிடப்பட்டது',
    openInMaps: 'கூகுள் வரைபடத்தில் திற',
    steps: 'திருப்பம் வாரியான வழிகாட்டல்',
    distance: 'தூரம்',
    eta: 'மதிப்பிடப்பட்ட நேரம்',
    noSteps: 'இந்த மதிப்பிற்கு விரிவான வழிகாட்டல் இல்லை.'
  },
  sos: {
    button: 'SOS',
    hold: '2 வினாடிகள் அழுத்திப் பிடிக்கவும்',
    sending: 'அனுப்புகிறது',
    sent: 'அவசர கோரிக்கை பதிவு செய்யப்பட்டது',
    reference: 'குறிப்பு எண்',
    queued: 'இந்த சாதனத்தில் சேமிக்கப்பட்டது, இணைப்பு திரும்பியதும் அனுப்பப்படும்.',
    share: 'பகிர்',
    copy: 'நகலெடு',
    whatsapp: 'வாட்ஸ்அப்',
    sms: 'SMS',
    viewOnMap: 'வரைபடத்தில் காண்க'
  },
  reports: {
    title: 'சமூக அறிக்கைகள்',
    submit: 'அறிக்கையை சமர்ப்பி',
    description: 'விவரம்',
    type: 'நிலை',
    verified: 'சரிபார்க்கப்பட்டது',
    unverified: 'சரிபார்க்கப்படவில்லை',
    rejected: 'நிராகரிக்கப்பட்டது',
    empty: 'இன்னும் அறிக்கைகள் சமர்ப்பிக்கப்படவில்லை.',
    helpful: 'உறுதிப்படுத்து',
    notHelpful: 'மறு',
    road_blocked: 'சாலை தடை',
    flooded_area: 'வெள்ள பகுதி',
    medical_help: 'மருத்துவ உதவி தேவை',
    food_water: 'உணவு அல்லது தண்ணீர் தேவை',
    person_missing: 'நபர் காணவில்லை',
    power_outage: 'மின் தடை'
  },
  contacts: {
    title: 'அவசர தொடர்புகள்',
    call: 'அழை',
    personal: 'தனிப்பட்ட தொடர்புகள்',
    addPersonal: 'தொடர்பைச் சேர்',
    name: 'பெயர்',
    number: 'எண்',
    empty: 'இந்த சாதனத்தில் தனிப்பட்ட தொடர்புகள் இல்லை.'
  },
  checkin: {
    title: 'குடும்ப பாதுகாப்பு தகவல்',
    safe: 'நான் பாதுகாப்பாக இருக்கிறேன்',
    yourName: 'உங்கள் பெயர்',
    message: 'செய்தி',
    lookup: 'ஒரு பெயரைத் தேடு',
    search: 'தேடு',
    recent: 'சமீபத்திய தகவல்கள்',
    empty: 'தகவல்கள் இல்லை.',
    shareText: 'இந்த தகவலைப் பகிர்'
  },
  alerts: { title: 'எச்சரிக்கைகள்', none: 'எச்சரிக்கைகள் இல்லை.', history: 'எச்சரிக்கை வரலாறு' },
  weather: {
    title: 'வானிலை மற்றும் வெள்ள அபாயம்',
    rainNow: 'தற்போதைய மழை',
    rain24h: 'அடுத்த 24 மணி மழை',
    wind: 'காற்று',
    riskLow: 'குறைந்த அபாயம்',
    riskModerate: 'மிதமான அபாயம்',
    riskHigh: 'அதிக அபாயம்',
    riskSevere: 'கடுமையான அபாயம்',
    riskUnknown: 'அபாயம் தெரியவில்லை',
    unavailable: 'வானிலை தரவு கிடைக்கவில்லை.'
  },
  earthquakes: {
    title: 'சமீபத்திய நிலநடுக்கங்கள்',
    magnitude: 'அளவு',
    depth: 'ஆழம்',
    empty: 'இந்த பகுதியில் சமீபத்திய நிலநடுக்கம் இல்லை.'
  },
  admin: {
    title: 'அதிகாரிகள் டாஷ்போர்டு',
    openSos: 'திறந்த SOS',
    sheltersOpen: 'திறந்த தங்குமிடங்கள்',
    occupancy: 'மொத்த நிரம்பல்',
    activeReports: 'செயலில் உள்ள அறிக்கைகள்',
    sosOverTime: 'கடந்த 24 மணி SOS கோரிக்கைகள்',
    occupancyPerShelter: 'தங்குமிட நிரம்பல்',
    reportsByType: 'வகை வாரியான அறிக்கைகள்',
    liveSos: 'நேரலை SOS கோரிக்கைகள்',
    shelterManagement: 'தங்குமிட மேலாண்மை',
    hazardZones: 'ஆபத்து பகுதிகள்',
    composeAlert: 'எச்சரிக்கையை வெளியிடு',
    moderation: 'அறிக்கை மதிப்பாய்வு',
    simulate: 'பேரிடரை உருவகப்படுத்து',
    acknowledge: 'ஒப்புக்கொள்',
    resolve: 'தீர்வு',
    addByMap: 'தங்குமிடம் சேர்க்க வரைபடத்தைக் கிளிக் செய்',
    connected: 'நேரலை இணைப்பு',
    clients: 'இணைக்கப்பட்ட சாதனங்கள்'
  },
  auth: {
    title: 'உள்நுழை',
    subtitle: 'அதிகாரி மற்றும் தொண்டர் அணுகல்',
    email: 'மின்னஞ்சல்',
    password: 'கடவுச்சொல்',
    submit: 'உள்நுழை',
    demoCredentials: 'மாதிரி சான்றுகள்',
    adminOnly: 'இந்த பகுதிக்கு நிர்வாக கணக்கு தேவை.'
  },
  traffic: {
    toggle: 'போக்குவரத்து அடுக்கு',
    legend: 'போக்குவரத்து',
    simulated: 'உருவகப்படுத்தப்பட்டது',
    simulatedHint:
      'போக்குவரத்து சேவை விசை அமைக்கப்படவில்லை, எனவே இந்த அடுக்கு விளக்கத்திற்காக உள்ளூரில் உருவாக்கப்பட்டது.',
    incidents: 'சம்பவங்கள்',
    closures: 'மூடல்கள்',
    delay: 'போக்குவரத்து தாமதம்: {{minutes}} நிமிடம்',
    aware: 'பயண நேரத்தில் நேரலை போக்குவரத்து அடங்கும்',
    level: {
      free: 'தடையற்ற ஓட்டம்',
      slow: 'மெதுவாக',
      heavy: 'அதிக நெரிசல்',
      blocked: 'தடைபட்டது'
    }
  },
  radar: {
    toggle: 'மழை ரேடார்',
    frame: 'ரேடார் சட்டகம்',
    forecast: 'முன்னறிவிப்பு',
    unavailable: 'மழை ரேடார் கிடைக்கவில்லை.'
  },
  risk: {
    title: 'இருப்பிட அபாயம்',
    low: 'குறைவு',
    medium: 'நடுத்தரம்',
    high: 'அதிகம்',
    showFactors: 'காரணிகளைக் காட்டு',
    hideFactors: 'காரணிகளை மறை'
  },
  evacuation: {
    title: 'வெளியேற்ற பயன்முறை',
    start: 'வெளியேற்ற பயன்முறையைத் தொடங்கு',
    needRoute: 'முதலில் ஒரு தங்குமிடத்தைத் தேர்ந்து பாதையைத் திட்டமிடுங்கள்.',
    continue: 'நேராக தொடரவும்',
    arrived: 'நீங்கள் வந்து சேர்ந்தீர்கள்',
    offRoute: 'பாதைக்குத் திரும்புங்கள்',
    offRouteBadge: 'பாதையை விட்டு விலகியது',
    rerouting: 'மீண்டும் கணக்கிடுகிறது',
    rerouted: 'புதிய பாதை கணக்கிடப்பட்டது',
    recalculate: 'மீண்டும் கணக்கிடு',
    waitingForLocation: 'உங்கள் இருப்பிடத்திற்காக காத்திருக்கிறது',
    heading: 'செல்லும் இடம்',
    remaining: 'மீதம்',
    eta: 'மீதமுள்ள நேரம்',
    step: 'படி',
    noSteps: 'விரிவான படிகள் இல்லை',
    voiceOn: 'குரல் வழிகாட்டலை இயக்கு',
    voiceOff: 'குரல் வழிகாட்டலை நிறுத்து'
  },
  qr: {
    title: 'வருகை குறியீடு',
    pageTitle: 'தங்குமிட வருகை பதிவு',
    pageSubtitle:
      'எத்தனை பேர் வருகிறார்கள் என்பதை உறுதிப்படுத்தவும், இதனால் கணக்கு சரியாக இருக்கும்.',
    partySize: 'வரும் நபர்கள்',
    confirm: 'வருகையைப் பதிவு செய்',
    recorded: 'வருகை பதிவு செய்யப்பட்டது',
    recordedDetail: '{{name}} இல் {{people}} பேர் வருகை பதிவு செய்யப்பட்டது.',
    disclaimer: 'இது அனைவருக்கும் தெரியும் தங்குமிட நிரம்பலைப் புதுப்பிக்கும்.',
    notFound: 'இந்த தங்குமிடம் கண்டறியப்படவில்லை.',
    badLink: 'இந்த பதிவு இணைப்பு சரியானது அல்ல.',
    backToMap: 'வரைபடத்திற்குத் திரும்பு',
    capacityLine: '{{capacity}} இல் {{free}} இடங்கள் காலி',
    instruction: 'வந்ததும் ஸ்கேன் செய்து உங்கள் இடத்தைப் பதிவு செய்யுங்கள்.',
    noAddress: 'முகவரி பதிவு செய்யப்படவில்லை',
    adminTitle: 'வருகை QR குறியீடுகள்',
    adminHint: 'இவற்றை அச்சிட்டு ஒவ்வொரு தங்குமிட வாசலிலும் வைக்கவும்.',
    showCodes: 'குறியீடுகளைக் காட்டு',
    hideCodes: 'குறியீடுகளை மறை'
  },
  report: {
    title: 'நிலை அறிக்கை',
    print: 'அச்சிடு',
    generated: 'உருவாக்கப்பட்டது',
    scope: 'இந்த அமைப்பில் உள்ள நேரலை தரவில் இருந்து தயாரிக்கப்பட்டது.',
    overview: 'மேலோட்டம்',
    shelterStatus: 'தங்குமிட நிலை',
    activeHazards: 'செயலில் உள்ள ஆபத்து பகுதிகள்',
    outstandingSos: 'நிலுவையில் உள்ள SOS கோரிக்கைகள்',
    communityReports: 'சமூக அறிக்கைகள்',
    backToDashboard: 'டாஷ்போர்டுக்குத் திரும்பு',
    totalCapacity: 'மொத்த கொள்ளளவு',
    placesFree: 'காலி இடங்கள்',
    sosResolved: 'தீர்க்கப்பட்ட SOS',
    shelter: 'தங்குமிடம்',
    occupied: 'நிரம்பியது',
    free: 'காலி',
    status: 'நிலை',
    zone: 'பகுதி',
    severity: 'தீவிரம்',
    location: 'இருப்பிடம்',
    received: 'பெறப்பட்டது',
    votes: 'நிகர வாக்குகள்',
    none: 'பதிவு இல்லை',
    footer: 'பேரிடர் மேலாண்மை தளத்தால் செயல்பாட்டு பயன்பாட்டிற்காக உருவாக்கப்பட்டது.'
  },
  map: {
    showLiveData: 'நேரலை தரவைக் காட்டு',
    hideLiveData: 'நேரலை தரவை மறை',
    needLocation: 'முதலில் இருப்பிடத்தை இயக்கவும் அல்லது மாதிரி இடத்தைத் தேர்ந்தெடுக்கவும்.',
    needLocationRoute: 'பாதையைத் திட்டமிட ஒரு இருப்பிடம் தேவை.',
    routeFailed: 'பாதையைத் திட்டமிட முடியவில்லை.'
  },
  common: {
    loading: 'ஏற்றுகிறது',
    retry: 'மீண்டும் முயற்சி',
    close: 'மூடு',
    cancel: 'ரத்து',
    save: 'சேமி',
    saving: 'சேமிக்கிறது',
    dos: 'செய்ய வேண்டியவை',
    donts: 'செய்யக்கூடாதவை',
    safetyTips: 'பாதுகாப்பு வழிகாட்டல்',
    error: 'ஏதோ தவறு நடந்தது',
    none: 'ஏதுமில்லை'
  }
};

const hi = {
  app: { name: 'आपदा प्रबंधन', shortName: 'आपदा ऐप' },
  nav: {
    map: 'मानचित्र',
    shelters: 'शरण स्थल',
    reports: 'रिपोर्ट',
    contacts: 'संपर्क',
    checkin: 'सुरक्षा सूचना',
    admin: 'प्रशासन',
    login: 'साइन इन',
    logout: 'साइन आउट'
  },
  status: {
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन',
    live: 'लाइव',
    disconnected: 'डिस्कनेक्ट',
    gpsActive: 'GPS सक्रिय',
    gpsSearching: 'GPS खोज रहा है',
    gpsDenied: 'GPS अस्वीकृत',
    gpsDemo: 'डेमो स्थान'
  },
  disaster: {
    flood: 'बाढ़',
    cyclone: 'चक्रवात',
    earthquake: 'भूकंप',
    fire: 'आग',
    tsunami: 'सुनामी'
  },
  location: {
    title: 'अपने पास शरण स्थल खोजें',
    body: 'आपके स्थान का उपयोग पास के शरण स्थलों को क्रमबद्ध करने और सुरक्षित मार्ग बनाने के लिए होता है। यह इसी डिवाइस पर रहता है।',
    enable: 'स्थान सक्षम करें',
    demo: 'डेमो स्थान उपयोग करें',
    locateMe: 'मुझे खोजें',
    followOn: 'आपकी स्थिति का अनुसरण',
    followOff: 'स्थिति का अनुसरण करें'
  },
  shelters: {
    title: 'निकटतम शरण स्थल',
    findSafest: 'सबसे सुरक्षित शरण स्थल खोजें',
    recommended: 'अनुशंसित',
    capacity: 'क्षमता',
    free: 'खाली',
    available: 'स्थान उपलब्ध',
    limited: 'सीमित स्थान',
    full: 'क्षमता पूर्ण',
    closed: 'बंद',
    updated: 'अद्यतन',
    why: 'यह शरण स्थल क्यों',
    facilities: 'सुविधाएं',
    empty: 'वर्तमान फ़िल्टर के अनुसार कोई शरण स्थल नहीं मिला।',
    accessible: 'सीढ़ी रहित पहुंच'
  },
  route: {
    title: 'मार्ग',
    hazardAvoiding: 'संकट से बचने वाला मार्ग',
    crossesHazard: 'मार्ग संकट क्षेत्र से होकर जाता है',
    estimated: 'अनुमानित',
    openInMaps: 'गूगल मैप्स में खोलें',
    steps: 'मोड़ दर मोड़ निर्देश',
    distance: 'दूरी',
    eta: 'अनुमानित समय',
    noSteps: 'इस अनुमान के लिए विस्तृत निर्देश उपलब्ध नहीं हैं।'
  },
  sos: {
    button: 'SOS',
    hold: '2 सेकंड दबाकर रखें',
    sending: 'भेज रहा है',
    sent: 'आपातकालीन अनुरोध दर्ज हुआ',
    reference: 'संदर्भ',
    queued: 'इस डिवाइस पर सहेजा गया, कनेक्शन आने पर भेजा जाएगा।',
    share: 'साझा करें',
    copy: 'कॉपी',
    whatsapp: 'व्हाट्सऐप',
    sms: 'SMS',
    viewOnMap: 'मानचित्र पर देखें'
  },
  reports: {
    title: 'सामुदायिक रिपोर्ट',
    submit: 'रिपोर्ट भेजें',
    description: 'विवरण',
    type: 'स्थिति',
    verified: 'सत्यापित',
    unverified: 'असत्यापित',
    rejected: 'अस्वीकृत',
    empty: 'अभी कोई रिपोर्ट नहीं भेजी गई।',
    helpful: 'पुष्टि करें',
    notHelpful: 'असहमति',
    road_blocked: 'सड़क अवरुद्ध',
    flooded_area: 'जलभराव क्षेत्र',
    medical_help: 'चिकित्सा सहायता आवश्यक',
    food_water: 'भोजन या पानी आवश्यक',
    person_missing: 'व्यक्ति लापता',
    power_outage: 'बिजली कटौती'
  },
  contacts: {
    title: 'आपातकालीन संपर्क',
    call: 'कॉल',
    personal: 'निजी संपर्क',
    addPersonal: 'संपर्क जोड़ें',
    name: 'नाम',
    number: 'नंबर',
    empty: 'इस डिवाइस पर कोई निजी संपर्क सहेजा नहीं गया।'
  },
  checkin: {
    title: 'परिवार सुरक्षा सूचना',
    safe: 'मैं सुरक्षित हूं',
    yourName: 'आपका नाम',
    message: 'संदेश',
    lookup: 'नाम खोजें',
    search: 'खोजें',
    recent: 'हाल की सूचनाएं',
    empty: 'कोई सूचना नहीं मिली।',
    shareText: 'यह सूचना साझा करें'
  },
  alerts: { title: 'चेतावनी', none: 'कोई सक्रिय चेतावनी नहीं।', history: 'चेतावनी इतिहास' },
  weather: {
    title: 'मौसम और बाढ़ जोखिम',
    rainNow: 'वर्तमान वर्षा',
    rain24h: 'अगले 24 घंटे वर्षा',
    wind: 'हवा',
    riskLow: 'कम जोखिम',
    riskModerate: 'मध्यम जोखिम',
    riskHigh: 'उच्च जोखिम',
    riskSevere: 'गंभीर जोखिम',
    riskUnknown: 'जोखिम अज्ञात',
    unavailable: 'मौसम डेटा उपलब्ध नहीं है।'
  },
  earthquakes: {
    title: 'हाल के भूकंप',
    magnitude: 'तीव्रता',
    depth: 'गहराई',
    empty: 'इस क्षेत्र में हाल में कोई भूकंप नहीं।'
  },
  admin: {
    title: 'प्राधिकरण डैशबोर्ड',
    openSos: 'खुले SOS',
    sheltersOpen: 'खुले शरण स्थल',
    occupancy: 'कुल अधिभोग',
    activeReports: 'सक्रिय रिपोर्ट',
    sosOverTime: 'पिछले 24 घंटे के SOS अनुरोध',
    occupancyPerShelter: 'शरण स्थल अधिभोग',
    reportsByType: 'प्रकार अनुसार रिपोर्ट',
    liveSos: 'लाइव SOS अनुरोध',
    shelterManagement: 'शरण स्थल प्रबंधन',
    hazardZones: 'संकट क्षेत्र',
    composeAlert: 'चेतावनी प्रकाशित करें',
    moderation: 'रिपोर्ट मॉडरेशन',
    simulate: 'आपदा अनुकरण',
    acknowledge: 'स्वीकार करें',
    resolve: 'समाधान',
    addByMap: 'शरण स्थल जोड़ने के लिए मानचित्र पर क्लिक करें',
    connected: 'रीयलटाइम जुड़ा',
    clients: 'जुड़े डिवाइस'
  },
  auth: {
    title: 'साइन इन',
    subtitle: 'प्राधिकरण और स्वयंसेवक पहुंच',
    email: 'ईमेल',
    password: 'पासवर्ड',
    submit: 'साइन इन',
    demoCredentials: 'डेमो क्रेडेंशियल',
    adminOnly: 'इस क्षेत्र के लिए प्रशासक खाता आवश्यक है।'
  },
  traffic: {
    toggle: 'यातायात लेयर',
    legend: 'यातायात',
    simulated: 'अनुकरणित',
    simulatedHint:
      'कोई यातायात सेवा कुंजी कॉन्फ़िगर नहीं है, इसलिए यह लेयर प्रदर्शन हेतु स्थानीय रूप से बनाई गई है.',
    incidents: 'घटनाएं',
    closures: 'बंद मार्ग',
    delay: 'यातायात के कारण देरी: {{minutes}} मिनट',
    aware: 'यात्रा समय में लाइव यातायात शामिल है',
    level: {
      free: 'निर्बाध प्रवाह',
      slow: 'धीमा',
      heavy: 'भारी',
      blocked: 'अवरुद्ध'
    }
  },
  radar: {
    toggle: 'वर्षा रडार',
    frame: 'रडार फ़्रेम',
    forecast: 'पूर्वानुमान',
    unavailable: 'वर्षा रडार उपलब्ध नहीं है.'
  },
  risk: {
    title: 'स्थान जोखिम',
    low: 'कम',
    medium: 'मध्यम',
    high: 'उच्च',
    showFactors: 'कारक दिखाएं',
    hideFactors: 'कारक छिपाएं'
  },
  evacuation: {
    title: 'निकासी मोड',
    start: 'निकासी मोड शुरू करें',
    needRoute: 'पहले शरण स्थल चुनें और मार्ग बनाएं.',
    continue: 'आगे चलते रहें',
    arrived: 'आप पहुंच गए हैं',
    offRoute: 'मार्ग पर लौटें',
    offRouteBadge: 'मार्ग से भटके',
    rerouting: 'पुनः गणना',
    rerouted: 'नया मार्ग बनाया गया',
    recalculate: 'पुनः गणना करें',
    waitingForLocation: 'आपके स्थान की प्रतीक्षा',
    heading: 'गंतव्य',
    remaining: 'शेष',
    eta: 'शेष समय',
    step: 'चरण',
    noSteps: 'विस्तृत चरण उपलब्ध नहीं',
    voiceOn: 'ध्वनि मार्गदर्शन चालू करें',
    voiceOff: 'ध्वनि मार्गदर्शन बंद करें'
  },
  qr: {
    title: 'आगमन कोड',
    pageTitle: 'शरण स्थल आगमन पंजीकरण',
    pageSubtitle: 'कितने लोग आ रहे हैं यह पुष्टि करें ताकि अधिभोग सटीक रहे.',
    partySize: 'आने वाले लोग',
    confirm: 'आगमन दर्ज करें',
    recorded: 'आगमन दर्ज हुआ',
    recordedDetail: '{{name}} पर {{people}} लोगों का आगमन दर्ज किया गया.',
    disclaimer: 'इससे सभी को दिखने वाला शरण स्थल अधिभोग अद्यतन होता है.',
    notFound: 'यह शरण स्थल नहीं मिला.',
    badLink: 'यह पंजीकरण लिंक मान्य नहीं है.',
    backToMap: 'मानचित्र पर लौटें',
    capacityLine: '{{capacity}} में से {{free}} स्थान खाली',
    instruction: 'पहुंचने पर स्कैन करें और अपना स्थान दर्ज करें.',
    noAddress: 'पता दर्ज नहीं है',
    adminTitle: 'आगमन QR कोड',
    adminHint: 'इन्हें छापकर प्रत्येक शरण स्थल के प्रवेश द्वार पर लगाएं.',
    showCodes: 'कोड दिखाएं',
    hideCodes: 'कोड छिपाएं'
  },
  report: {
    title: 'स्थिति रिपोर्ट',
    print: 'प्रिंट',
    generated: 'निर्मित',
    scope: 'इस परिनियोजन के लाइव परिचालन डेटा से तैयार.',
    overview: 'सारांश',
    shelterStatus: 'शरण स्थल स्थिति',
    activeHazards: 'सक्रिय संकट क्षेत्र',
    outstandingSos: 'लंबित SOS अनुरोध',
    communityReports: 'सामुदायिक रिपोर्ट',
    backToDashboard: 'डैशबोर्ड पर लौटें',
    totalCapacity: 'कुल क्षमता',
    placesFree: 'खाली स्थान',
    sosResolved: 'हल किए गए SOS',
    shelter: 'शरण स्थल',
    occupied: 'भरा हुआ',
    free: 'खाली',
    status: 'स्थिति',
    zone: 'क्षेत्र',
    severity: 'गंभीरता',
    location: 'स्थान',
    received: 'प्राप्त',
    votes: 'कुल मत',
    none: 'कोई दर्ज नहीं',
    footer: 'आपदा प्रबंधन मंच द्वारा परिचालन उपयोग हेतु निर्मित.'
  },
  map: {
    showLiveData: 'लाइव डेटा दिखाएं',
    hideLiveData: 'लाइव डेटा छिपाएं',
    needLocation: 'पहले स्थान सक्षम करें या डेमो स्थान चुनें.',
    needLocationRoute: 'मार्ग बनाने के लिए स्थान आवश्यक है.',
    routeFailed: 'मार्ग नहीं बनाया जा सका.'
  },
  common: {
    loading: 'लोड हो रहा है',
    retry: 'पुनः प्रयास',
    close: 'बंद करें',
    cancel: 'रद्द',
    save: 'सहेजें',
    saving: 'सहेज रहा है',
    dos: 'क्या करें',
    donts: 'क्या न करें',
    safetyTips: 'सुरक्षा मार्गदर्शन',
    error: 'कुछ गलत हुआ',
    none: 'कोई नहीं'
  }
};

const storedLanguage = readString(STORAGE_KEYS.language, 'en');
const initialLanguage = LANGUAGES.some((item) => item.code === storedLanguage)
  ? storedLanguage
  : 'en';

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ta: { translation: ta },
    hi: { translation: hi }
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false
});

export function changeLanguage(code) {
  writeString(STORAGE_KEYS.language, code);
  return i18next.changeLanguage(code);
}

export default i18next;
