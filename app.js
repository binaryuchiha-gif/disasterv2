/*
  app.js
  Disaster Management Web App - core application logic.
  Sections: STATE, I18N, STORAGE, UTILITIES, MAP, GPS, HAZARDS,
            RANKING, ROUTING, SOS, ALERTS, CONTACTS, CHECKIN,
            REPORTS, ADMIN, PWA, UI/NAV, INIT
*/

(function () {
  "use strict";

  /* =======================================================
     STATE
  ======================================================= */

  var CHENNAI_DEMO = { lat: 13.0827, lng: 80.2707 };

  var state = {
    lang: "en",
    theme: "light",
    map: null,
    streetLayer: null,

    satelliteLayer: null,
    usingSatellite: false,
    userMarker: null,
    userAccuracyCircle: null,
    userPos: null,
    usingDemoLocation: false,
    gpsStatus: "searching", // searching | active | denied | demo
    watchId: null,
    followMode: false,
    lastRankingPos: null,
    activeDisaster: null,
    hazardLayerGroup: null,
    shelterMarkers: {},
    reportMarkers: {},
    shelters: [],
    routeLayer: null,
    currentView: "map",
    sosHoldTimer: null,
    sosHoldStart: null,
    sosHoldRaf: null,
    adminAddMode: false,
    alertRotationIndex: 0,
    alertRotationTimer: null,
    sosHistory: [],
    userContacts: [],
    crowdReports: []
  };

  /* =======================================================
     I18N
  ======================================================= */

  var I18N = {
    en: {
      brand: "Disaster Management",
      status_online: "Online",
      status_offline: "Offline",
      gps_searching: "GPS: Searching",
      gps_active: "GPS: Active",
      gps_denied: "GPS: Denied",
      gps_demo: "GPS: Demo location",
      loc_title: "Find shelters near you",
      loc_body: "This app uses your location to show nearby shelters and calculate the safest route. Location is only used on this device and is not sent to any server.",
      loc_enable: "Enable location",
      loc_demo: "Use demo location (Chennai)",
      menu_simulate: "Simulate disaster",
      menu_checkin: "Family check-in",
      menu_cleardata: "Clear local data",
      disaster_flood: "Flood",
      disaster_cyclone: "Cyclone",
      disaster_earthquake: "Earthquake",
      disaster_fire: "Fire",
      disaster_tsunami: "Tsunami",
      layer_satellite: "Satellite",
      layer_street: "Street",
      find_safest: "Find safest shelter",
      sos: "SOS",
      nearest_shelters: "Nearest shelters",
      route_title: "Route",
      open_google_maps: "Open in Google Maps",
      tips_do: "Do",
      tips_dont: "Do not",
      nav_map: "Map",
      nav_shelters: "Shelters",
      nav_contacts: "Contacts",
      nav_report: "Report",
      nav_admin: "Admin",
      contacts_emergency: "Emergency numbers (India)",
      contacts_personal: "Your contacts",
      contact_name_placeholder: "Name",
      contact_phone_placeholder: "Phone number",
      contacts_add: "Add contact",
      checkin_title: "Family check-in",
      checkin_hint: "Let your family know you are safe with your current location and time.",
      checkin_button: "I am safe",
      report_hint: "Report a situation to help others nearby. Reports are stored on this device for the demo.",
      report_road_blocked: "Road blocked",
      report_flooded: "Flooded area",
      report_medical: "Medical help needed",
      report_food_water: "Food or water needed",
      report_missing: "Person missing",
      report_recent: "Recent reports",
      admin_hint: "Demo mode admin panel. No login required. Changes apply immediately to the user view.",
      admin_add_shelter: "Tap the map to add a shelter",
      sos_sent_title: "SOS signal ready",
      sos_view_map: "View on map",
      sos_whatsapp: "WhatsApp",
      sos_sms: "SMS",
      sos_copy: "Copy",
      sos_share: "Share",
      sos_history: "SOS history",
      checkin_result_title: "Check-in message ready",
      label_recommended: "Recommended",
      label_away: "away",
      label_min: "min",
      label_capacity: "Capacity",
      label_updated: "Updated",
      label_estimated: "Estimated",
      label_safe_route: "Safest route",
      label_full: "Full",
      label_closed: "Closed",
      label_available: "available",
      label_limited: "Limited space",
      label_no_results: "No open shelters match right now. Try a different disaster type.",
      toast_location_enabled: "Location enabled",
      toast_location_denied: "Location permission denied. Enable it in your browser settings. Using demo location for now.",
      toast_location_unavailable: "Location unavailable. Using demo location.",
      toast_location_timeout: "Location request timed out. Retrying.",
      toast_location_demo: "Using demo location (Chennai)",
      toast_shelter_updated: "Shelter updated",
      toast_shelter_added: "Shelter added",
      toast_contact_added: "Contact added",
      toast_report_added: "Report submitted",
      toast_checkin_ready: "Check-in message ready to share",
      toast_sos_ready: "SOS signal ready to share",
      toast_copied: "Copied to clipboard",
      toast_route_estimated: "Could not reach routing service. Showing an estimated straight-line route.",
      toast_data_cleared: "Local data cleared",
      toast_admin_tap_map: "Switched to map view. Tap the map to place a new shelter.",
      alert_default: "No active alerts in your area",
      alert_simulated: "Simulated alert: "
    },
    ta: {
      brand: "பேரிடர் மேலாண்மை",
      status_online: "இணையத்தில்",
      status_offline: "இணைப்பு இல்லை",
      gps_searching: "GPS: தேடுகிறது",
      gps_active: "GPS: செயலில்",
      gps_denied: "GPS: மறுக்கப்பட்டது",
      gps_demo: "GPS: டெமோ இடம்",
      loc_title: "அருகிலுள்ள தங்குமிடங்களைக் கண்டறியவும்",
      loc_body: "அருகிலுள்ள தங்குமிடங்களைக் காட்டவும் பாதுகாப்பான வழியைக் கணக்கிடவும் இந்த செயலி உங்கள் இருப்பிடத்தைப் பயன்படுத்துகிறது. இருப்பிடம் இந்த சாதனத்தில் மட்டுமே பயன்படுத்தப்படுகிறது.",
      loc_enable: "இருப்பிடத்தை இயக்கு",
      loc_demo: "டெமோ இடத்தைப் பயன்படுத்து (சென்னை)",
      menu_simulate: "பேரிடரை உருவகப்படுத்து",
      menu_checkin: "குடும்ப பாதுகாப்பு தகவல்",
      menu_cleardata: "உள்ளூர் தரவை அழி",
      disaster_flood: "வெள்ளம்",
      disaster_cyclone: "புயல்",
      disaster_earthquake: "நிலநடுக்கம்",
      disaster_fire: "தீ விபத்து",
      disaster_tsunami: "சுனாமி",
      layer_satellite: "செயற்கைக்கோள்",
      layer_street: "தெரு",
      find_safest: "பாதுகாப்பான தங்குமிடம்",
      sos: "SOS",
      nearest_shelters: "அருகிலுள்ள தங்குமிடங்கள்",
      route_title: "பாதை",
      open_google_maps: "கூகுள் மேப்ஸில் திற",
      tips_do: "செய்ய வேண்டியவை",
      tips_dont: "செய்யக்கூடாதவை",
      nav_map: "வரைபடம்",
      nav_shelters: "தங்குமிடங்கள்",
      nav_contacts: "தொடர்புகள்",
      nav_report: "புகார்",
      nav_admin: "நிர்வாகம்",
      contacts_emergency: "அவசர எண்கள் (இந்தியா)",
      contacts_personal: "உங்கள் தொடர்புகள்",
      contact_name_placeholder: "பெயர்",
      contact_phone_placeholder: "தொலைபேசி எண்",
      contacts_add: "தொடர்பைச் சேர்",
      checkin_title: "குடும்ப பாதுகாப்பு தகவல்",
      checkin_hint: "உங்கள் இடம் மற்றும் நேரத்துடன் நீங்கள் பாதுகாப்பாக இருப்பதை தெரிவிக்கவும்.",
      checkin_button: "நான் பாதுகாப்பாக இருக்கிறேன்",
      report_hint: "அருகில் உள்ளவர்களுக்கு உதவ ஒரு சூழ்நிலையைப் புகாரளிக்கவும். புகார்கள் இந்த சாதனத்தில் சேமிக்கப்படும்.",
      report_road_blocked: "சாலை தடை",
      report_flooded: "வெள்ள பகுதி",
      report_medical: "மருத்துவ உதவி தேவை",
      report_food_water: "உணவு அல்லது தண்ணீர் தேவை",
      report_missing: "நபர் காணவில்லை",
      report_recent: "சமீபத்திய புகார்கள்",
      admin_hint: "டெமோ நிர்வாக பலகம். உள்நுழைவு தேவையில்லை. மாற்றங்கள் உடனடியாக பயனர் பார்வையில் தெரியும்.",
      admin_add_shelter: "புதிய தங்குமிடத்தைச் சேர்க்க வரைபடத்தைத் தட்டவும்",
      sos_sent_title: "SOS சமிக்ஞை தயார்",
      sos_view_map: "வரைபடத்தில் காண்க",
      sos_whatsapp: "வாட்ஸ்அப்",
      sos_sms: "SMS",
      sos_copy: "நகலெடு",
      sos_share: "பகிர்",
      sos_history: "SOS வரலாறு",
      checkin_result_title: "பாதுகாப்பு தகவல் தயார்",
      label_recommended: "பரிந்துரைக்கப்படுகிறது",
      label_away: "தொலைவில்",
      label_min: "நிமிடம்",
      label_capacity: "கொள்ளளவு",
      label_updated: "புதுப்பிக்கப்பட்டது",
      label_estimated: "மதிப்பிடப்பட்டது",
      label_safe_route: "பாதுகாப்பான பாதை",
      label_full: "முழு",
      label_closed: "மூடப்பட்டது",
      label_available: "கிடைக்கிறது",
      label_limited: "குறைந்த இடம்",
      label_no_results: "இப்போது பொருந்தும் தங்குமிடங்கள் இல்லை. வேறு பேரிடர் வகையை முயற்சிக்கவும்.",
      toast_location_enabled: "இருப்பிடம் இயக்கப்பட்டது",
      toast_location_denied: "இருப்பிட அனுமதி மறுக்கப்பட்டது. உங்கள் உலாவி அமைப்புகளில் இயக்கவும். இப்போதைக்கு டெமோ இடம் பயன்படுத்தப்படுகிறது.",
      toast_location_unavailable: "இருப்பிடம் கிடைக்கவில்லை. டெமோ இடம் பயன்படுத்தப்படுகிறது.",
      toast_location_timeout: "இருப்பிட கோரிக்கை நேரம் கடந்தது. மீண்டும் முயற்சிக்கிறது.",
      toast_location_demo: "டெமோ இடம் பயன்படுத்தப்படுகிறது (சென்னை)",
      toast_shelter_updated: "தங்குமிடம் புதுப்பிக்கப்பட்டது",
      toast_shelter_added: "தங்குமிடம் சேர்க்கப்பட்டது",
      toast_contact_added: "தொடர்பு சேர்க்கப்பட்டது",
      toast_report_added: "புகார் சமர்ப்பிக்கப்பட்டது",
      toast_checkin_ready: "பாதுகாப்பு தகவல் பகிர தயார்",
      toast_sos_ready: "SOS சமிக்ஞை பகிர தயார்",
      toast_copied: "நகலெடுக்கப்பட்டது",
      toast_route_estimated: "வழித்தட சேவையை அடைய முடியவில்லை. மதிப்பிடப்பட்ட நேர்கோட்டு பாதை காட்டப்படுகிறது.",
      toast_data_cleared: "உள்ளூர் தரவு அழிக்கப்பட்டது",
      toast_admin_tap_map: "வரைபட காட்சிக்கு மாறியது. புதிய தங்குமிடத்தை வைக்க வரைபடத்தைத் தட்டவும்.",
      alert_default: "உங்கள் பகுதியில் எச்சரிக்கைகள் இல்லை",
      alert_simulated: "உருவகப்படுத்தப்பட்ட எச்சரிக்கை: "
    },
    hi: {
      brand: "आपदा प्रबंधन",
      status_online: "ऑनलाइन",
      status_offline: "ऑफलाइन",
      gps_searching: "GPS: खोज रहा है",
      gps_active: "GPS: सक्रिय",
      gps_denied: "GPS: अस्वीकृत",
      gps_demo: "GPS: डेमो स्थान",
      loc_title: "पास के शरण स्थल खोजें",
      loc_body: "यह ऐप आपके स्थान का उपयोग पास के शरण स्थलों को दिखाने और सबसे सुरक्षित मार्ग निकालने के लिए करता है। स्थान केवल इस डिवाइस पर उपयोग होता है, किसी सर्वर पर नहीं भेजा जाता।",
      loc_enable: "स्थान सक्षम करें",
      loc_demo: "डेमो स्थान का उपयोग करें (चेन्नई)",
      menu_simulate: "आपदा का अनुकरण करें",
      menu_checkin: "परिवार चेक-इन",
      menu_cleardata: "स्थानीय डेटा साफ़ करें",
      disaster_flood: "बाढ़",
      disaster_cyclone: "चक्रवात",
      disaster_earthquake: "भूकंप",
      disaster_fire: "आग",
      disaster_tsunami: "सुनामी",
      layer_satellite: "उपग्रह",
      layer_street: "सड़क",
      find_safest: "सबसे सुरक्षित शरण स्थल खोजें",
      sos: "SOS",
      nearest_shelters: "निकटतम शरण स्थल",
      route_title: "मार्ग",
      open_google_maps: "गूगल मैप्स में खोलें",
      tips_do: "क्या करें",
      tips_dont: "क्या न करें",
      nav_map: "मानचित्र",
      nav_shelters: "शरण स्थल",
      nav_contacts: "संपर्क",
      nav_report: "रिपोर्ट",
      nav_admin: "व्यवस्थापक",
      contacts_emergency: "आपातकालीन नंबर (भारत)",
      contacts_personal: "आपके संपर्क",
      contact_name_placeholder: "नाम",
      contact_phone_placeholder: "फोन नंबर",
      contacts_add: "संपर्क जोड़ें",
      checkin_title: "परिवार चेक-इन",
      checkin_hint: "अपने परिवार को अपने वर्तमान स्थान और समय के साथ बताएं कि आप सुरक्षित हैं।",
      checkin_button: "मैं सुरक्षित हूँ",
      report_hint: "आस-पास के लोगों की मदद के लिए स्थिति की रिपोर्ट करें। रिपोर्ट इस डिवाइस पर सहेजी जाती हैं।",
      report_road_blocked: "सड़क अवरुद्ध",
      report_flooded: "जलभराव क्षेत्र",
      report_medical: "चिकित्सा सहायता आवश्यक",
      report_food_water: "भोजन या पानी आवश्यक",
      report_missing: "व्यक्ति लापता",
      report_recent: "हाल की रिपोर्ट",
      admin_hint: "डेमो मोड व्यवस्थापक पैनल। लॉगिन आवश्यक नहीं है। परिवर्तन तुरंत उपयोगकर्ता दृश्य में दिखेंगे।",
      admin_add_shelter: "नया शरण स्थल जोड़ने के लिए मानचित्र पर टैप करें",
      sos_sent_title: "SOS संकेत तैयार",
      sos_view_map: "मानचित्र पर देखें",
      sos_whatsapp: "व्हाट्सऐप",
      sos_sms: "SMS",
      sos_copy: "कॉपी करें",
      sos_share: "साझा करें",
      sos_history: "SOS इतिहास",
      checkin_result_title: "चेक-इन संदेश तैयार",
      label_recommended: "अनुशंसित",
      label_away: "दूर",
      label_min: "मिनट",
      label_capacity: "क्षमता",
      label_updated: "अपडेट किया गया",
      label_estimated: "अनुमानित",
      label_safe_route: "सबसे सुरक्षित मार्ग",
      label_full: "भरा हुआ",
      label_closed: "बंद",
      label_available: "उपलब्ध",
      label_limited: "सीमित जगह",
      label_no_results: "अभी कोई उपयुक्त शरण स्थल नहीं मिला। कोई अन्य आपदा प्रकार चुनें।",
      toast_location_enabled: "स्थान सक्षम किया गया",
      toast_location_denied: "स्थान अनुमति अस्वीकृत। अपनी ब्राउज़र सेटिंग में इसे सक्षम करें। अभी के लिए डेमो स्थान उपयोग किया जा रहा है।",
      toast_location_unavailable: "स्थान उपलब्ध नहीं है। डेमो स्थान उपयोग किया जा रहा है।",
      toast_location_timeout: "स्थान का अनुरोध समय समाप्त हो गया। पुनः प्रयास किया जा रहा है।",
      toast_location_demo: "डेमो स्थान उपयोग किया जा रहा है (चेन्नई)",
      toast_shelter_updated: "शरण स्थल अपडेट किया गया",
      toast_shelter_added: "शरण स्थल जोड़ा गया",
      toast_contact_added: "संपर्क जोड़ा गया",
      toast_report_added: "रिपोर्ट सबमिट की गई",
      toast_checkin_ready: "चेक-इन संदेश साझा करने के लिए तैयार",
      toast_sos_ready: "SOS संकेत साझा करने के लिए तैयार",
      toast_copied: "क्लिपबोर्ड पर कॉपी किया गया",
      toast_route_estimated: "रूटिंग सेवा उपलब्ध नहीं हो सकी। अनुमानित सीधी रेखा वाला मार्ग दिखाया जा रहा है।",
      toast_data_cleared: "स्थानीय डेटा साफ़ किया गया",
      toast_admin_tap_map: "मानचित्र दृश्य पर स्विच किया गया। नया शरण स्थल रखने के लिए मानचित्र पर टैप करें।",
      alert_default: "आपके क्षेत्र में कोई सक्रिय चेतावनी नहीं",
      alert_simulated: "अनुकरणित चेतावनी: "
    }
  };

  function t(key) {
    var dict = I18N[state.lang] || I18N.en;
    return dict[key] || I18N.en[key] || key;
  }

  function applyI18n() {
    document.documentElement.setAttribute("lang", state.lang);
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-i18n");
      nodes[i].textContent = t(key);
    }
    var placeholders = document.querySelectorAll("[data-i18n-placeholder]");
    for (var j = 0; j < placeholders.length; j++) {
      var pKey = placeholders[j].getAttribute("data-i18n-placeholder");
      placeholders[j].setAttribute("placeholder", t(pKey));
    }
    updateGpsChip();
    updateOnlineChip();
    renderEmergencyContacts();
    renderUserContacts();
    renderShelterSheetIfOpen();
    renderShelterListFull();
    renderCrowdReports();
    renderAdminShelterList();
  }

  /* =======================================================
     STORAGE (localStorage helpers, all wrapped in try/catch)
  ======================================================= */

  var STORAGE_KEYS = {
    lang: "dm_lang",
    theme: "dm_theme",
    sosHistory: "dm_sos_history",
    userContacts: "dm_user_contacts",
    crowdReports: "dm_crowd_reports",
    shelterEdits: "dm_shelter_edits",
    adminAddedShelters: "dm_admin_added_shelters"
  };

  function storageGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      /* ignore */
    }
  }

  /* =======================================================
     UTILITIES
  ======================================================= */

  function haversineKm(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = ((lat2 - lat1) * Math.PI) / 180;
    var dLng = ((lng2 - lng1) * Math.PI) / 180;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function formatRelativeTime(isoString) {
    try {
      var then = new Date(isoString).getTime();
      var now = Date.now();
      var diffSec = Math.max(0, Math.floor((now - then) / 1000));
      if (diffSec < 60) return diffSec + "s ago";
      var diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return diffMin + "m ago";
      var diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return diffHr + "h ago";
      var diffDay = Math.floor(diffHr / 24);
      return diffDay + "d ago";
    } catch (e) {
      return "";
    }
  }

  function pointInPolygon(lat, lng, points) {
    // points: array of [lat, lng]. Ray casting algorithm.
    var inside = false;
    for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
      var xi = points[i][1], yi = points[i][0];
      var xj = points[j][1], yj = points[j][0];
      var intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInHazardZone(lat, lng, zones) {
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      if (z.type === "circle") {
        var d = haversineKm(lat, lng, z.center[0], z.center[1]) * 1000;
        if (d <= z.radiusMeters) return z;
      } else if (z.type === "polygon") {
        if (pointInPolygon(lat, lng, z.points)) return z;
      }
    }
    return null;
  }

  function getActiveHazardZones() {
    if (!state.activeDisaster) return [];
    return DISASTER_DATA.hazardZones[state.activeDisaster] || [];
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uid(prefix) {
    return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
  }

  function refreshIcons() {
    try {
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    } catch (e) {
      /* ignore icon render errors */
    }
  }

  /* =======================================================
     TOASTS
  ======================================================= */

  function showToast(message, type) {
    try {
      var container = document.getElementById("toastContainer");
      if (!container) return;
      var toast = document.createElement("div");
      toast.className = "toast" + (type === "success" ? " toast-success" : type === "error" ? " toast-error" : "");
      var iconName = type === "success" ? "check-circle" : type === "error" ? "alert-circle" : "info";
      toast.innerHTML = '<i data-lucide="' + iconName + '" aria-hidden="true"></i><span></span>';
      toast.querySelector("span").textContent = message;
      container.appendChild(toast);
      refreshIcons();
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 3800);
    } catch (e) {
      /* ignore toast errors */
    }
  }

  /* =======================================================
     MAP
  ======================================================= */

  function initMap() {
    try {
      var startLat = CHENNAI_DEMO.lat;
      var startLng = CHENNAI_DEMO.lng;
      state.map = L.map("map", {
        zoomControl: false,
        attributionControl: true
      }).setView([startLat, startLng], 12);

      L.control.zoom({ position: "bottomright" }).addTo(state.map);
      L.control.scale({ position: "bottomleft", imperial: false }).addTo(state.map);

      // Keyless OpenStreetMap standard tiles. Dark mode reuses the same tiles
      // with a CSS filter applied to the map container, so there is no second
      // tile provider to depend on.
      var OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
      var OSM_ATTRIBUTION =
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

      state.streetLayer = L.tileLayer(OSM_TILE_URL, {
        attribution: OSM_ATTRIBUTION,
        maxZoom: 19
      });

      state.satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri",
          maxZoom: 19
        }
      );

      setBaseLayer();

      state.hazardLayerGroup = L.layerGroup().addTo(state.map);

      state.map.on("dragstart", function () {
        if (state.followMode) {
          state.followMode = false;
          updateFollowButton();
        }
      });

      state.map.on("click", function (e) {
        if (state.adminAddMode) {
          handleAdminMapAdd(e.latlng);
        }
      });

      var skeleton = document.getElementById("mapSkeleton");
      if (skeleton) skeleton.classList.add("hidden");

      renderShelterMarkers();
      renderHazardZones();
    } catch (e) {
      showToast("Map failed to load. Please reload the page.", "error");
    }
  }

  function setBaseLayer() {
    try {
      [state.streetLayer, state.satelliteLayer].forEach(function (layer) {
        if (layer && state.map.hasLayer(layer)) state.map.removeLayer(layer);
      });

      var layer = state.usingSatellite ? state.satelliteLayer : state.streetLayer;
      layer.addTo(state.map);

      // Dark mode recolours the street tiles through a CSS filter on the map
      // container. Satellite imagery is never filtered.
      var container = state.map.getContainer();
      var wantsDark = state.theme === "dark" && !state.usingSatellite;
      if (container) {
        container.classList.toggle("basemap-is-dark", wantsDark);
      }
    } catch (e) {
      /* ignore */
    }
  }

  function toggleSatellite() {
    state.usingSatellite = !state.usingSatellite;
    setBaseLayer();
    var textEl = document.getElementById("layerToggleText");
    if (textEl) textEl.textContent = state.usingSatellite ? t("layer_street") : t("layer_satellite");
  }

  function buildShelterDivIcon(shelter) {
    var status = getShelterStatus(shelter);
    var color = status === "red" ? "#e5342c" : status === "amber" ? "#e0a316" : "#1a9e5c";
    if (shelter.closed) color = "#8a93a8";
    var html =
      '<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="' +
      color +
      '" stroke="#ffffff" stroke-width="1.5"/>' +
      '<circle cx="15" cy="15" r="6" fill="#ffffff"/>' +
      "</svg>";
    return L.divIcon({
      html: html,
      className: "custom-marker-icon",
      iconSize: [30, 40],
      iconAnchor: [15, 38],
      popupAnchor: [0, -34]
    });
  }

  function getShelterStatus(shelter) {
    if (shelter.closed || shelter.occupied >= shelter.capacity) return "red";
    var available = shelter.capacity - shelter.occupied;
    var ratio = available / shelter.capacity;
    if (ratio <= 0.25) return "amber";
    return "green";
  }

  function renderShelterMarkers() {
    try {
      Object.keys(state.shelterMarkers).forEach(function (id) {
        state.map.removeLayer(state.shelterMarkers[id]);
      });
      state.shelterMarkers = {};
      state.shelters.forEach(function (shelter) {
        var marker = L.marker([shelter.lat, shelter.lng], {
          icon: buildShelterDivIcon(shelter),
          title: shelter.name
        });
        marker.bindPopup(buildShelterPopupHtml(shelter));
        marker.addTo(state.map);
        state.shelterMarkers[shelter.id] = marker;
      });
    } catch (e) {
      /* ignore marker render errors */
    }
  }

  function buildShelterPopupHtml(shelter) {
    var status = getShelterStatus(shelter);
    var statusLabel = shelter.closed
      ? t("label_closed")
      : status === "red"
      ? t("label_full")
      : status === "amber"
      ? t("label_limited")
      : t("label_available");
    return (
      "<strong>" +
      escapeHtml(shelter.name) +
      "</strong><br/>" +
      escapeHtml(statusLabel) +
      " &middot; " +
      (shelter.capacity - shelter.occupied) +
      "/" +
      shelter.capacity +
      " " +
      t("label_available")
    );
  }

  function renderHazardZones() {
    try {
      state.hazardLayerGroup.clearLayers();
      var zones = getActiveHazardZones();
      zones.forEach(function (zone) {
        var layer;
        if (zone.type === "circle") {
          layer = L.circle(zone.center, {
            radius: zone.radiusMeters,
            color: "#e5342c",
            weight: 1.5,
            fillColor: "#e5342c",
            fillOpacity: 0.18
          });
        } else {
          layer = L.polygon(zone.points, {
            color: "#e5342c",
            weight: 1.5,
            fillColor: "#e5342c",
            fillOpacity: 0.18
          });
        }
        layer.bindPopup("<strong>" + escapeHtml(zone.name) + "</strong>");
        layer.addTo(state.hazardLayerGroup);
      });
    } catch (e) {
      /* ignore hazard render errors */
    }
  }

  /* =======================================================
     GPS
  ======================================================= */

  function requestLocation() {
    hideLocationOverlay();
    if (!("geolocation" in navigator)) {
      fallbackToDemoLocation(true);
      return;
    }
    setGpsStatus("searching");
    startWatch();
  }

  function startWatch() {
    try {
      if (state.watchId !== null) {
        navigator.geolocation.clearWatch(state.watchId);
      }
      state.watchId = navigator.geolocation.watchPosition(onGpsSuccess, onGpsError, {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 15000
      });
    } catch (e) {
      fallbackToDemoLocation(true);
    }
  }

  function onGpsSuccess(position) {
    state.usingDemoLocation = false;
    var coords = position.coords;
    state.userPos = {
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy,
      heading: typeof coords.heading === "number" && !isNaN(coords.heading) ? coords.heading : null
    };
    setGpsStatus("active");
    updateUserMarker();
    maybeRecalculateRanking();
    if (state.followMode) {
      flyToUser();
    }
  }

  function onGpsError(err) {
    var code = err && err.code;
    if (code === 1) {
      setGpsStatus("denied");
      showToast(t("toast_location_denied"), "error");
      fallbackToDemoLocation(false);
    } else if (code === 2) {
      showToast(t("toast_location_unavailable"), "error");
      fallbackToDemoLocation(false);
    } else if (code === 3) {
      showToast(t("toast_location_timeout"));
      setTimeout(function () {
        startWatch();
      }, 1500);
    } else {
      fallbackToDemoLocation(false);
    }
  }

  function fallbackToDemoLocation(silent) {
    state.usingDemoLocation = true;
    state.userPos = {
      lat: CHENNAI_DEMO.lat,
      lng: CHENNAI_DEMO.lng,
      accuracy: 50,
      heading: null
    };
    if (state.gpsStatus !== "denied") setGpsStatus("demo");
    updateUserMarker();
    maybeRecalculateRanking();
    if (!silent) {
      /* toast already shown by caller for specific error */
    }
  }

  function useDemoLocation() {
    hideLocationOverlay();
    if (state.watchId !== null) {
      try {
        navigator.geolocation.clearWatch(state.watchId);
      } catch (e) {
        /* ignore */
      }
      state.watchId = null;
    }
    state.usingDemoLocation = true;
    state.userPos = {
      lat: CHENNAI_DEMO.lat,
      lng: CHENNAI_DEMO.lng,
      accuracy: 30,
      heading: null
    };
    setGpsStatus("demo");
    updateUserMarker();
    maybeRecalculateRanking();
    showToast(t("toast_location_demo"), "success");
  }

  function setGpsStatus(status) {
    state.gpsStatus = status;
    updateGpsChip();
  }

  function updateGpsChip() {
    var chip = document.getElementById("gpsChip");
    var chipText = document.getElementById("gpsChipText");
    if (!chip || !chipText) return;
    chip.classList.remove("chip-ok", "chip-warn", "chip-danger", "chip-neutral");
    if (state.gpsStatus === "active") {
      var acc = state.userPos ? Math.round(state.userPos.accuracy) : null;
      chipText.textContent = t("gps_active") + (acc !== null ? " (" + acc + " m)" : "");
      chip.classList.add("chip-ok");
    } else if (state.gpsStatus === "denied") {
      chipText.textContent = t("gps_denied");
      chip.classList.add("chip-danger");
    } else if (state.gpsStatus === "demo") {
      chipText.textContent = t("gps_demo");
      chip.classList.add("chip-warn");
    } else {
      chipText.textContent = t("gps_searching");
      chip.classList.add("chip-neutral");
    }
  }

  function updateUserMarker() {
    try {
      if (!state.map || !state.userPos) return;
      var latlng = [state.userPos.lat, state.userPos.lng];

      var headingHtml =
        state.userPos.heading !== null
          ? '<div class="user-heading-arrow" style="transform: translate(-50%,-100%) rotate(' +
            state.userPos.heading +
            'deg);"></div>'
          : "";
      var html =
        '<div class="user-marker-wrap">' +
        '<div class="user-pulse-ring"></div>' +
        '<div class="user-dot"></div>' +
        headingHtml +
        "</div>";
      var icon = L.divIcon({
        html: html,
        className: "user-location-marker",
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      if (!state.userMarker) {
        state.userMarker = L.marker(latlng, { icon: icon, zIndexOffset: 1000 }).addTo(state.map);
      } else {
        state.userMarker.setLatLng(latlng);
        state.userMarker.setIcon(icon);
      }

      if (!state.userAccuracyCircle) {
        state.userAccuracyCircle = L.circle(latlng, {
          radius: state.userPos.accuracy || 30,
          color: "#2563eb",
          weight: 1,
          fillColor: "#2563eb",
          fillOpacity: 0.12
        }).addTo(state.map);
      } else {
        state.userAccuracyCircle.setLatLng(latlng);
        state.userAccuracyCircle.setRadius(state.userPos.accuracy || 30);
      }
    } catch (e) {
      /* ignore marker update errors */
    }
  }

  function flyToUser() {
    if (!state.map || !state.userPos) return;
    try {
      state.map.flyTo([state.userPos.lat, state.userPos.lng], Math.max(state.map.getZoom(), 14), {
        animate: true,
        duration: 0.8
      });
    } catch (e) {
      /* ignore */
    }
  }

  function toggleFollowMode() {
    state.followMode = !state.followMode;
    updateFollowButton();
    if (state.followMode) flyToUser();
  }

  function updateFollowButton() {
    var btn = document.getElementById("followModeBtn");
    if (btn) btn.setAttribute("aria-pressed", state.followMode ? "true" : "false");
  }

  function maybeRecalculateRanking() {
    if (!state.userPos) return;
    var moved = true;
    if (state.lastRankingPos) {
      var d = haversineKm(
        state.lastRankingPos.lat,
        state.lastRankingPos.lng,
        state.userPos.lat,
        state.userPos.lng
      );
      moved = d * 1000 > 100;
    }
    if (!moved) return;
    state.lastRankingPos = { lat: state.userPos.lat, lng: state.userPos.lng };
    debouncedRerender();
  }

  var debounceTimer = null;
  function debouncedRerender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      renderShelterSheetIfOpen();
      renderShelterListFull();
    }, 500);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      if (state.watchId !== null) {
        try {
          navigator.geolocation.clearWatch(state.watchId);
        } catch (e) {
          /* ignore */
        }
        state.watchId = null;
      }
    } else {
      if (!state.usingDemoLocation && state.gpsStatus !== "denied" && state.watchId === null) {
        startWatch();
      }
    }
  }

  /* =======================================================
     LOCATION PERMISSION OVERLAY
  ======================================================= */

  function hideLocationOverlay() {
    var overlay = document.getElementById("locationPermissionOverlay");
    if (overlay) overlay.classList.add("hidden");
  }

  /* =======================================================
     RANKING (shelter scoring)
  ======================================================= */

  function computeRankedShelters() {
    if (!state.userPos) return [];
    var hazardZones = getActiveHazardZones();
    var results = [];
    state.shelters.forEach(function (shelter) {
      if (shelter.closed) return;
      if (shelter.occupied >= shelter.capacity) return;
      var inHazard = hazardZones.length ? pointInHazardZone(shelter.lat, shelter.lng, hazardZones) : null;
      if (inHazard) return;

      var distanceKm = haversineKm(state.userPos.lat, state.userPos.lng, shelter.lat, shelter.lng);
      var etaMin = (distanceKm / 30) * 60;
      var available = shelter.capacity - shelter.occupied;
      var availableRatio = available / shelter.capacity;
      var facilitiesCount = (shelter.facilities || []).length;

      var score =
        distanceKm * 10 + etaMin * 0.5 + (1 - availableRatio) * 20 - facilitiesCount * 1.5;

      results.push({
        shelter: shelter,
        distanceKm: distanceKm,
        etaMin: etaMin,
        available: available,
        availableRatio: availableRatio,
        facilitiesCount: facilitiesCount,
        score: score
      });
    });
    results.sort(function (a, b) {
      return a.score - b.score;
    });
    return results;
  }

  /* =======================================================
     SHELTER SHEET / LIST RENDERING
  ======================================================= */

  var FACILITY_ICON_MAP = {
    water: "droplet",
    food: "utensils",
    medical: "cross",
    power: "zap",
    toilets: "shower-head",
    bedding: "bed"
  };

  function buildFacilityIconsHtml(facilities) {
    return (facilities || [])
      .map(function (f) {
        var icon = FACILITY_ICON_MAP[f] || "circle";
        return (
          '<span class="facility-icon" title="' +
          escapeHtml(f) +
          '"><i data-lucide="' +
          icon +
          '" aria-hidden="true"></i></span>'
        );
      })
      .join("");
  }

  function buildShelterCardHtml(entry, index, showRecommended) {
    var shelter = entry.shelter;
    var status = getShelterStatus(shelter);
    var ratio = entry.availableRatio;
    var barColor = status === "red" ? "#e5342c" : status === "amber" ? "#e0a316" : "#1a9e5c";
    var recommendedBadge =
      showRecommended && index === 0
        ? '<span class="badge badge-recommended">' + t("label_recommended") + "</span>"
        : "";
    return (
      '<div class="shelter-card" tabindex="0" role="button" data-shelter-id="' +
      shelter.id +
      '" aria-label="' +
      escapeHtml(shelter.name) +
      '">' +
      '<div class="shelter-card-top">' +
      '<span class="status-dot status-' +
      status +
      '"></span>' +
      '<div style="flex:1;min-width:0;">' +
      '<div class="shelter-card-name">' +
      escapeHtml(shelter.name) +
      "</div>" +
      '<div class="shelter-card-meta">' +
      '<span><i data-lucide="map-pin" aria-hidden="true"></i>' +
      entry.distanceKm.toFixed(1) +
      " km " +
      t("label_away") +
      "</span>" +
      '<span><i data-lucide="clock" aria-hidden="true"></i>~' +
      Math.round(entry.etaMin) +
      " " +
      t("label_min") +
      "</span>" +
      "</div>" +
      "</div>" +
      recommendedBadge +
      "</div>" +
      '<div class="capacity-bar-track"><div class="capacity-bar-fill" style="width:' +
      Math.round(ratio * 100) +
      "%;background:" +
      barColor +
      ';"></div></div>' +
      '<div class="facility-icons">' +
      buildFacilityIconsHtml(shelter.facilities) +
      "</div>" +
      '<div class="shelter-card-footer">' +
      "<span>" +
      entry.available +
      "/" +
      shelter.capacity +
      " " +
      t("label_available") +
      "</span>" +
      "<span>" +
      t("label_updated") +
      " " +
      formatRelativeTime(shelter.lastUpdated) +
      "</span>" +
      "</div>" +
      "</div>"
    );
  }

  function renderShelterSheetIfOpen() {
    var sheet = document.getElementById("shelterSheet");
    if (!sheet || !sheet.classList.contains("open")) return;
    renderShelterResultsInto(document.getElementById("shelterResultsList"), true);
  }

  function renderShelterResultsInto(container, showRecommended) {
    if (!container) return;
    var ranked = computeRankedShelters();
    var top = ranked.slice(0, 3);
    if (!top.length) {
      container.innerHTML = '<p class="section-hint">' + t("label_no_results") + "</p>";
      return;
    }
    container.innerHTML = top.map(function (entry, i) {
      return buildShelterCardHtml(entry, i, showRecommended);
    }).join("");
    refreshIcons();
    bindShelterCardHandlers(container);
  }

  function bindShelterCardHandlers(container) {
    var cards = container.querySelectorAll(".shelter-card");
    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        var id = card.getAttribute("data-shelter-id");
        var shelter = state.shelters.find(function (s) {
          return s.id === id;
        });
        if (shelter) routeToShelter(shelter);
      });
      card.addEventListener("keypress", function (e) {
        if (e.key === "Enter" || e.key === " ") card.click();
      });
    });
  }

  function renderShelterListFull() {
    var container = document.getElementById("shelterListFull");
    if (!container) return;
    if (!state.userPos) {
      container.innerHTML = '<p class="section-hint">' + t("label_no_results") + "</p>";
      return;
    }
    renderShelterResultsInto(container, true);
  }

  function initShelterSheetDrag() {
    var sheet = document.getElementById("shelterSheet");
    var handle = document.getElementById("shelterSheetHandle");
    if (!sheet || !handle) return;

    var dragging = false;
    var startY = 0;
    var startHeight = 0;

    function onPointerDown(e) {
      // Only enable custom drag on narrow (mobile sheet) layouts.
      if (window.innerWidth >= 900) return;
      dragging = true;
      startY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY) || 0;
      startHeight = sheet.getBoundingClientRect().height;
      sheet.style.transition = "none";
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    }

    function onPointerMove(e) {
      if (!dragging) return;
      var currentY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY) || 0;
      var delta = startY - currentY;
      var newHeight = Math.min(window.innerHeight * 0.85, Math.max(140, startHeight + delta));
      sheet.style.maxHeight = newHeight + "px";
    }

    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = "";
      var currentY = e.clientY !== undefined ? e.clientY : (e.changedTouches && e.changedTouches[0].clientY) || 0;
      var delta = startY - currentY;
      if (delta < -60) {
        closeShelterSheet();
        sheet.style.maxHeight = "";
      }
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    }

    handle.addEventListener("pointerdown", onPointerDown);
  }

  function openShelterSheet() {
    var sheet = document.getElementById("shelterSheet");
    if (!sheet) return;
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    renderShelterSheetIfOpen();
  }

  function closeShelterSheet() {
    var sheet = document.getElementById("shelterSheet");
    if (!sheet) return;
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    sheet.style.maxHeight = "";
  }

  function findSafestShelter() {
    if (!state.userPos) {
      showToast(t("toast_location_unavailable"), "error");
      fallbackToDemoLocation(true);
    }
    openShelterSheet();
    var panel = document.getElementById("routeInfoPanel");
    if (panel) panel.classList.add("hidden");
    var ranked = computeRankedShelters();
    if (ranked.length) {
      // Auto preview route for the top recommendation after a short delay
      // so the list renders first.
    }
  }

  /* =======================================================
     ROUTING
  ======================================================= */

  function clearRouteLayer() {
    if (state.routeLayer) {
      try {
        state.map.removeLayer(state.routeLayer);
      } catch (e) {
        /* ignore */
      }
      state.routeLayer = null;
    }
  }

  function routeToShelter(shelter) {
    if (!state.userPos) {
      showToast(t("toast_location_unavailable"), "error");
      return;
    }
    switchView("map");
    openShelterSheet();

    var origin = state.userPos;
    var dest = shelter;

    document.getElementById("routeToName").textContent = shelter.name;
    var panel = document.getElementById("routeInfoPanel");
    panel.classList.remove("hidden");
    document.getElementById("routeSummary").textContent = "Calculating route...";
    document.getElementById("routeSteps").innerHTML = "";
    var badge = document.getElementById("routeBadge");
    badge.textContent = "";
    badge.className = "badge badge-neutral";

    var gmapsLink =
      "https://www.google.com/maps/dir/?api=1&origin=" +
      origin.lat +
      "," +
      origin.lng +
      "&destination=" +
      dest.lat +
      "," +
      dest.lng +
      "&travelmode=driving";
    document.getElementById("openInGoogleMapsLink").setAttribute("href", gmapsLink);

    fetchOsrmRoute(origin, dest)
      .then(function (result) {
        drawRoute(result.coords, false);
        badge.textContent = t("label_safe_route");
        badge.className = "badge badge-recommended";
        document.getElementById("routeSummary").textContent =
          result.distanceKm.toFixed(1) + " km, ~" + Math.round(result.durationMin) + " " + t("label_min");
        renderRouteSteps(result.steps);
      })
      .catch(function () {
        showToast(t("toast_route_estimated"));
        var distanceKm = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
        drawRoute(
          [
            [origin.lat, origin.lng],
            [dest.lat, dest.lng]
          ],
          true
        );
        badge.textContent = t("label_estimated");
        badge.className = "badge badge-estimated";
        document.getElementById("routeSummary").textContent =
          distanceKm.toFixed(1) + " km (" + t("label_estimated").toLowerCase() + ")";
        document.getElementById("routeSteps").innerHTML = "";
      });
  }

  function drawRoute(latlngs, dashed) {
    clearRouteLayer();
    try {
      state.routeLayer = L.polyline(latlngs, {
        color: dashed ? "#5b6478" : "#2563eb",
        weight: 5,
        opacity: 0.9,
        dashArray: dashed ? "8,8" : null
      }).addTo(state.map);
      state.map.flyToBounds(state.routeLayer.getBounds(), { padding: [60, 60], duration: 0.8 });
    } catch (e) {
      /* ignore draw errors */
    }
  }

  function renderRouteSteps(steps) {
    var list = document.getElementById("routeSteps");
    if (!steps || !steps.length) {
      list.innerHTML = "";
      return;
    }
    list.innerHTML = steps
      .map(function (s) {
        return "<li>" + escapeHtml(s) + "</li>";
      })
      .join("");
  }

  function fetchOsrmRoute(origin, dest) {
    return new Promise(function (resolve, reject) {
      try {
        var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        var timeoutId = setTimeout(function () {
          if (controller) controller.abort();
        }, 7000);

        var url =
          "https://router.project-osrm.org/route/v1/driving/" +
          origin.lng +
          "," +
          origin.lat +
          ";" +
          dest.lng +
          "," +
          dest.lat +
          "?overview=full&geometries=geojson&steps=true&alternatives=true";

        fetch(url, controller ? { signal: controller.signal } : {})
          .then(function (res) {
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error("OSRM response not ok");
            return res.json();
          })
          .then(function (data) {
            if (!data || data.code !== "Ok" || !data.routes || !data.routes.length) {
              throw new Error("No routes returned");
            }
            var hazardZones = getActiveHazardZones();
            var best = pickBestRoute(data.routes, hazardZones);
            var coords = best.geometry.coordinates.map(function (c) {
              return [c[1], c[0]];
            });
            var steps = [];
            if (best.legs && best.legs[0] && best.legs[0].steps) {
              best.legs[0].steps.forEach(function (step) {
                steps.push(formatStepText(step));
              });
            }
            resolve({
              coords: coords,
              distanceKm: best.distance / 1000,
              durationMin: best.duration / 60,
              steps: steps
            });
          })
          .catch(function (err) {
            clearTimeout(timeoutId);
            reject(err);
          });
      } catch (e) {
        reject(e);
      }
    });
  }

  function pickBestRoute(routes, hazardZones) {
    if (!hazardZones.length || routes.length === 1) return routes[0];
    var scored = routes.map(function (route) {
      var intersections = 0;
      var coords = route.geometry.coordinates;
      var sampleStep = Math.max(1, Math.floor(coords.length / 25));
      for (var i = 0; i < coords.length; i += sampleStep) {
        var lng = coords[i][0];
        var lat = coords[i][1];
        if (pointInHazardZone(lat, lng, hazardZones)) intersections++;
      }
      return { route: route, intersections: intersections };
    });
    scored.sort(function (a, b) {
      if (a.intersections !== b.intersections) return a.intersections - b.intersections;
      return a.route.duration - b.route.duration;
    });
    return scored[0].route;
  }

  function formatStepText(step) {
    try {
      var maneuver = step.maneuver || {};
      var type = maneuver.type || "continue";
      var modifier = maneuver.modifier ? " " + maneuver.modifier : "";
      var road = step.name && step.name.length ? " on " + step.name : "";
      var typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
      return typeLabel + modifier + road;
    } catch (e) {
      return "Continue";
    }
  }

  /* =======================================================
     SOS
  ======================================================= */

  var SOS_HOLD_MS = 2000;

  function startSosHold() {
    cancelSosHold();
    state.sosHoldStart = Date.now();
    var ring = document.getElementById("sosRingProgress");
    var circumference = 2 * Math.PI * 46;
    document.getElementById("sosBtn").classList.add("charging");

    function tick() {
      var elapsed = Date.now() - state.sosHoldStart;
      var progress = Math.min(1, elapsed / SOS_HOLD_MS);
      if (ring) ring.style.strokeDashoffset = String(circumference * (1 - progress));
      if (progress >= 1) {
        triggerSos();
        cancelSosHold();
        return;
      }
      state.sosHoldRaf = requestAnimationFrame(tick);
    }
    state.sosHoldRaf = requestAnimationFrame(tick);
  }

  function cancelSosHold() {
    if (state.sosHoldRaf) {
      cancelAnimationFrame(state.sosHoldRaf);
      state.sosHoldRaf = null;
    }
    state.sosHoldStart = null;
    var ring = document.getElementById("sosRingProgress");
    if (ring) ring.style.strokeDashoffset = String(2 * Math.PI * 46);
    var btn = document.getElementById("sosBtn");
    if (btn) btn.classList.remove("charging");
  }

  function triggerSos() {
    var pos = state.userPos || { lat: CHENNAI_DEMO.lat, lng: CHENNAI_DEMO.lng };
    var timestamp = new Date().toISOString();
    var entry = { lat: pos.lat, lng: pos.lng, timestamp: timestamp };
    state.sosHistory.unshift(entry);
    state.sosHistory = state.sosHistory.slice(0, 20);
    storageSet(STORAGE_KEYS.sosHistory, state.sosHistory);

    var mapsUrl = "https://www.google.com/maps?q=" + pos.lat + "," + pos.lng;
    document.getElementById("sosCoords").textContent = pos.lat.toFixed(5) + ", " + pos.lng.toFixed(5);
    document.getElementById("sosMapLink").setAttribute("href", mapsUrl);

    var message =
      "SOS. I need help. My location: " + mapsUrl + " (" + new Date(timestamp).toLocaleString() + ")";
    state.lastSosMessage = message;

    renderSosHistory();
    openModal("sosResultModal");
    showToast(t("toast_sos_ready"), "success");

    try {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    } catch (e) {
      /* ignore */
    }
  }

  function renderSosHistory() {
    var container = document.getElementById("sosHistoryList");
    if (!container) return;
    if (!state.sosHistory.length) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = state.sosHistory
      .map(function (entry) {
        return (
          '<div class="sos-history-item"><span>' +
          entry.lat.toFixed(4) +
          ", " +
          entry.lng.toFixed(4) +
          "</span><span>" +
          formatRelativeTime(entry.timestamp) +
          "</span></div>"
        );
      })
      .join("");
  }

  function shareViaWhatsapp(message) {
    window.open("https://wa.me/?text=" + encodeURIComponent(message), "_blank", "noopener");
  }

  function shareViaSms(message) {
    window.location.href = "sms:?body=" + encodeURIComponent(message);
  }

  function copyToClipboard(message) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(message)
          .then(function () {
            showToast(t("toast_copied"), "success");
          })
          .catch(function () {
            showToast(t("toast_copied"));
          });
      } else {
        var textarea = document.createElement("textarea");
        textarea.value = message;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showToast(t("toast_copied"), "success");
      }
    } catch (e) {
      showToast(t("toast_copied"));
    }
  }

  function shareViaWebShare(message) {
    try {
      if (navigator.share) {
        navigator.share({ text: message }).catch(function () {
          /* user cancelled or unsupported, ignore */
        });
      } else {
        copyToClipboard(message);
      }
    } catch (e) {
      copyToClipboard(message);
    }
  }

  /* =======================================================
     ALERTS
  ======================================================= */

  var MOCK_ALERTS = [
    "No active alerts in your area",
    "Heavy rainfall expected along the coast in the next 6 hours",
    "High tide advisory for fishing communities near Marina and Ennore",
    "Routine civil defense drill scheduled this week in North Chennai"
  ];

  function startAlertRotation() {
    renderAlertBanner(MOCK_ALERTS[0]);
    state.alertRotationTimer = setInterval(function () {
      state.alertRotationIndex = (state.alertRotationIndex + 1) % MOCK_ALERTS.length;
      renderAlertBanner(MOCK_ALERTS[state.alertRotationIndex]);
    }, 7000);
  }

  function renderAlertBanner(text, critical) {
    var banner = document.getElementById("alertBanner");
    var textEl = document.getElementById("alertBannerText");
    if (!banner || !textEl) return;
    textEl.textContent = text;
    banner.classList.remove("hidden");
    banner.classList.toggle("alert-critical", !!critical);
  }

  function playAlarmTone() {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      var beepTimes = [0, 0.3, 0.6];
      beepTimes.forEach(function (startOffset) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = 880;
        gain.gain.value = 0.15;
        osc.connect(gain);
        gain.connect(ctx.destination);
        var startTime = ctx.currentTime + startOffset;
        osc.start(startTime);
        osc.stop(startTime + 0.22);
      });
      setTimeout(function () {
        try {
          ctx.close();
        } catch (e) {
          /* ignore */
        }
      }, 1500);
    } catch (e) {
      /* ignore audio errors */
    }
  }

  function simulateDisaster() {
    var type = state.activeDisaster || "flood";
    setActiveDisaster(type);
    renderAlertBanner(t("alert_simulated") + t("disaster_" + type), true);
    playAlarmTone();
    try {
      if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
    } catch (e) {
      /* ignore */
    }
    switchView("map");
    var ranked = computeRankedShelters();
    if (ranked.length) {
      openShelterSheet();
      setTimeout(function () {
        routeToShelter(ranked[0].shelter);
      }, 300);
    } else {
      openShelterSheet();
    }
  }

  /* =======================================================
     DISASTER CHIPS / SAFETY TIPS
  ======================================================= */

  function setActiveDisaster(type) {
    var chips = document.querySelectorAll(".disaster-chip");
    var isSame = state.activeDisaster === type;
    state.activeDisaster = isSame ? null : type;
    chips.forEach(function (chip) {
      var chipType = chip.getAttribute("data-disaster");
      chip.setAttribute("aria-pressed", chipType === state.activeDisaster ? "true" : "false");
    });
    renderHazardZones();
    renderShelterSheetIfOpen();
    renderShelterListFull();
    if (!isSame && state.activeDisaster) {
      openSafetyTips(state.activeDisaster);
    }
  }

  function openSafetyTips(type) {
    var tips = DISASTER_DATA.safetyTips[type];
    if (!tips) return;
    document.getElementById("safetyTipsTitle").textContent = tips.title;
    document.getElementById("safetyTipsDos").innerHTML = tips.dos
      .map(function (d) {
        return "<li>" + escapeHtml(d) + "</li>";
      })
      .join("");
    document.getElementById("safetyTipsDonts").innerHTML = tips.donts
      .map(function (d) {
        return "<li>" + escapeHtml(d) + "</li>";
      })
      .join("");
    document.getElementById("safetyTipsSheet").classList.remove("hidden");
    refreshIcons();
  }

  function closeSafetyTips() {
    document.getElementById("safetyTipsSheet").classList.add("hidden");
  }

  /* =======================================================
     CONTACTS
  ======================================================= */

  var EMERGENCY_CONTACTS = [
    { name: "National Emergency Number", phone: "112" },
    { name: "Police", phone: "100" },
    { name: "Fire Service", phone: "101" },
    { name: "Ambulance", phone: "102" },
    { name: "Emergency Medical Services", phone: "108" },
    { name: "State Disaster Management Helpline", phone: "1070" },
    { name: "District Disaster Management Control Room", phone: "1077" },
    { name: "NDRF (National Disaster Response Force)", phone: "01124363260", display: "011-24363260" }
  ];

  function renderEmergencyContacts() {
    var container = document.getElementById("emergencyContactsList");
    if (!container) return;
    container.innerHTML = EMERGENCY_CONTACTS.map(function (c) {
      return (
        '<div class="contact-item"><div class="contact-item-info"><span class="contact-item-name">' +
        escapeHtml(c.name) +
        '</span><span class="contact-item-phone">' +
        escapeHtml(c.display || c.phone) +
        '</span></div><a class="contact-call-btn" href="tel:' +
        c.phone +
        '"><i data-lucide="phone" aria-hidden="true"></i>Call</a></div>'
      );
    }).join("");
    refreshIcons();
  }

  function renderUserContacts() {
    var container = document.getElementById("userContactsList");
    if (!container) return;
    if (!state.userContacts.length) {
      container.innerHTML = '<p class="section-hint">No contacts added yet.</p>';
      return;
    }
    container.innerHTML = state.userContacts
      .map(function (c, i) {
        return (
          '<div class="contact-item"><div class="contact-item-info"><span class="contact-item-name">' +
          escapeHtml(c.name) +
          '</span><span class="contact-item-phone">' +
          escapeHtml(c.phone) +
          '</span></div><a class="contact-call-btn" href="tel:' +
          escapeHtml(c.phone) +
          '"><i data-lucide="phone" aria-hidden="true"></i>Call</a></div>'
        );
      })
      .join("");
    refreshIcons();
  }

  function addUserContact(name, phone) {
    state.userContacts.push({ name: name, phone: phone });
    storageSet(STORAGE_KEYS.userContacts, state.userContacts);
    renderUserContacts();
    showToast(t("toast_contact_added"), "success");
  }

  /* =======================================================
     CHECK-IN
  ======================================================= */

  function performCheckIn() {
    var pos = state.userPos || { lat: CHENNAI_DEMO.lat, lng: CHENNAI_DEMO.lng };
    var mapsUrl = "https://www.google.com/maps?q=" + pos.lat + "," + pos.lng;
    var message = "I am safe. Location: " + mapsUrl + ". Time: " + new Date().toLocaleString();
    state.lastCheckInMessage = message;
    document.getElementById("checkInMessage").textContent = message;
    openModal("checkInResultModal");
    showToast(t("toast_checkin_ready"), "success");
  }

  /* =======================================================
     CROWD REPORTS
  ======================================================= */

  var REPORT_TYPE_META = {
    road_blocked: { icon: "construction", labelKey: "report_road_blocked" },
    flooded_area: { icon: "droplets", labelKey: "report_flooded" },
    medical_help: { icon: "cross", labelKey: "report_medical" },
    food_water: { icon: "utensils", labelKey: "report_food_water" },
    person_missing: { icon: "user-search", labelKey: "report_missing" }
  };

  function submitReport(type) {
    var pos = state.userPos || { lat: CHENNAI_DEMO.lat, lng: CHENNAI_DEMO.lng };
    var entry = {
      id: uid("report"),
      type: type,
      lat: pos.lat,
      lng: pos.lng,
      timestamp: new Date().toISOString()
    };
    state.crowdReports.unshift(entry);
    state.crowdReports = state.crowdReports.slice(0, 50);
    storageSet(STORAGE_KEYS.crowdReports, state.crowdReports);
    addReportMarker(entry);
    renderCrowdReports();
    showToast(t("toast_report_added"), "success");
  }

  function addReportMarker(entry) {
    try {
      var meta = REPORT_TYPE_META[entry.type] || { icon: "flag" };
      var html =
        '<div style="width:26px;height:26px;border-radius:50%;background:#e5342c;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="4"/></svg>' +
        "</div>";
      var icon = L.divIcon({ html: html, className: "custom-marker-icon", iconSize: [26, 26], iconAnchor: [13, 13] });
      var marker = L.marker([entry.lat, entry.lng], { icon: icon });
      marker.bindPopup(
        "<strong>" + escapeHtml(t(meta.labelKey || "")) + "</strong><br/>" + formatRelativeTime(entry.timestamp)
      );
      marker.addTo(state.map);
      state.reportMarkers[entry.id] = marker;
    } catch (e) {
      /* ignore */
    }
  }

  function renderCrowdReports() {
    var container = document.getElementById("reportList");
    if (!container) return;
    if (!state.crowdReports.length) {
      container.innerHTML = '<p class="section-hint">No reports yet.</p>';
      return;
    }
    container.innerHTML = state.crowdReports
      .map(function (entry) {
        var meta = REPORT_TYPE_META[entry.type] || { icon: "flag", labelKey: "" };
        return (
          '<div class="report-item"><i data-lucide="' +
          meta.icon +
          '" aria-hidden="true"></i><div><div class="report-item-text">' +
          escapeHtml(t(meta.labelKey)) +
          '</div><div class="report-item-time">' +
          formatRelativeTime(entry.timestamp) +
          "</div></div></div>"
        );
      })
      .join("");
    refreshIcons();
  }

  /* =======================================================
     ADMIN
  ======================================================= */

  function loadSheltersWithOverrides() {
    var base = DISASTER_DATA.shelters.map(function (s) {
      return Object.assign({}, s, { facilities: s.facilities.slice() });
    });
    var edits = storageGet(STORAGE_KEYS.shelterEdits, {});
    base.forEach(function (shelter) {
      var edit = edits[shelter.id];
      if (edit) {
        shelter.occupied = typeof edit.occupied === "number" ? edit.occupied : shelter.occupied;
        shelter.closed = !!edit.closed;
        shelter.lastUpdated = edit.lastUpdated || shelter.lastUpdated;
      }
    });
    var added = storageGet(STORAGE_KEYS.adminAddedShelters, []);
    added.forEach(function (s) {
      base.push(s);
    });
    return base;
  }

  function saveShelterEdit(shelter) {
    var edits = storageGet(STORAGE_KEYS.shelterEdits, {});
    edits[shelter.id] = {
      occupied: shelter.occupied,
      closed: !!shelter.closed,
      lastUpdated: shelter.lastUpdated
    };
    storageSet(STORAGE_KEYS.shelterEdits, edits);
  }

  function renderAdminShelterList() {
    var container = document.getElementById("adminShelterList");
    if (!container) return;
    container.innerHTML = state.shelters
      .map(function (shelter) {
        return (
          '<div class="admin-shelter-card" data-admin-id="' +
          shelter.id +
          '">' +
          '<div class="admin-shelter-row"><span class="admin-shelter-name">' +
          escapeHtml(shelter.name) +
          "</span></div>" +
          '<div class="admin-controls">' +
          '<label style="font-size:12px;color:var(--color-text-muted);">Occupied' +
          '<input type="number" min="0" max="' +
          shelter.capacity +
          '" value="' +
          shelter.occupied +
          '" data-admin-occupied="' +
          shelter.id +
          '" style="display:block;margin-top:4px;" /></label>' +
          '<span style="font-size:12px;color:var(--color-text-muted);">of ' +
          shelter.capacity +
          "</span>" +
          '<div class="toggle-switch ' +
          (shelter.closed ? "" : "on") +
          '" data-admin-toggle="' +
          shelter.id +
          '" role="switch" aria-checked="' +
          (!shelter.closed) +
          '" tabindex="0" aria-label="Open or closed"></div>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    container.querySelectorAll("[data-admin-occupied]").forEach(function (input) {
      input.addEventListener("change", function () {
        var id = input.getAttribute("data-admin-occupied");
        var shelter = state.shelters.find(function (s) {
          return s.id === id;
        });
        if (!shelter) return;
        var val = parseInt(input.value, 10);
        if (isNaN(val) || val < 0) val = 0;
        if (val > shelter.capacity) val = shelter.capacity;
        shelter.occupied = val;
        shelter.lastUpdated = new Date().toISOString();
        saveShelterEdit(shelter);
        renderShelterMarkers();
        renderShelterSheetIfOpen();
        renderShelterListFull();
        showToast(t("toast_shelter_updated"), "success");
      });
    });

    container.querySelectorAll("[data-admin-toggle]").forEach(function (toggle) {
      function flip() {
        var id = toggle.getAttribute("data-admin-toggle");
        var shelter = state.shelters.find(function (s) {
          return s.id === id;
        });
        if (!shelter) return;
        shelter.closed = !shelter.closed;
        shelter.lastUpdated = new Date().toISOString();
        saveShelterEdit(shelter);
        renderShelterMarkers();
        renderShelterSheetIfOpen();
        renderShelterListFull();
        renderAdminShelterList();
        showToast(t("toast_shelter_updated"), "success");
      }
      toggle.addEventListener("click", flip);
      toggle.addEventListener("keypress", function (e) {
        if (e.key === "Enter" || e.key === " ") flip();
      });
    });
  }

  function toggleAdminAddMode() {
    state.adminAddMode = !state.adminAddMode;
    if (state.adminAddMode) {
      switchView("map");
      showToast(t("toast_admin_tap_map"));
    }
  }

  function handleAdminMapAdd(latlng) {
    try {
      var name = window.prompt("Shelter name:", "New Shelter");
      if (!name) {
        state.adminAddMode = false;
        return;
      }
      var capacityRaw = window.prompt("Capacity:", "100");
      var capacity = parseInt(capacityRaw, 10);
      if (isNaN(capacity) || capacity <= 0) capacity = 100;

      var shelter = {
        id: uid("sh-admin"),
        name: name,
        lat: latlng.lat,
        lng: latlng.lng,
        capacity: capacity,
        occupied: 0,
        facilities: ["water", "toilets"],
        phone: "",
        type: "community_hall",
        lastUpdated: new Date().toISOString(),
        closed: false
      };
      state.shelters.push(shelter);
      var added = storageGet(STORAGE_KEYS.adminAddedShelters, []);
      added.push(shelter);
      storageSet(STORAGE_KEYS.adminAddedShelters, added);

      state.adminAddMode = false;
      renderShelterMarkers();
      renderAdminShelterList();
      renderShelterListFull();
      showToast(t("toast_shelter_added"), "success");
    } catch (e) {
      state.adminAddMode = false;
    }
  }

  /* =======================================================
     PWA / ONLINE STATUS
  ======================================================= */

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () {
        /* registration failure should not break the app */
      });
    }
  }

  function updateOnlineChip() {
    var chip = document.getElementById("onlineChip");
    var text = document.getElementById("onlineChipText");
    if (!chip || !text) return;
    var online = navigator.onLine;
    chip.classList.remove("chip-ok", "chip-danger");
    chip.classList.add(online ? "chip-ok" : "chip-danger");
    text.textContent = online ? t("status_online") : t("status_offline");
  }

  /* =======================================================
     UI / NAVIGATION
  ======================================================= */

  function switchView(viewName) {
    state.currentView = viewName;
    document.querySelectorAll(".view").forEach(function (view) {
      view.classList.remove("active-view");
    });
    var target = document.getElementById("view-" + viewName);
    if (target) target.classList.add("active-view");

    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-view") === viewName);
    });

    if (viewName === "map" && state.map) {
      setTimeout(function () {
        state.map.invalidateSize();
      }, 50);
    }
  }

  function openModal(id) {
    var modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove("hidden");
      refreshIcons();
    }
  }

  function closeModal(id) {
    var modal = document.getElementById(id);
    if (modal) modal.classList.add("hidden");
  }

  function toggleMenu() {
    var menu = document.getElementById("menuDropdown");
    var btn = document.getElementById("menuBtn");
    var isHidden = menu.classList.contains("hidden");
    menu.classList.toggle("hidden");
    btn.setAttribute("aria-expanded", isHidden ? "true" : "false");
  }

  function closeMenu() {
    document.getElementById("menuDropdown").classList.add("hidden");
    document.getElementById("menuBtn").setAttribute("aria-expanded", "false");
  }

  function toggleDarkMode() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme === "dark" ? "dark" : "light");
    storageSet(STORAGE_KEYS.theme, state.theme);
    var icon = document.getElementById("darkModeToggle").querySelector("i");
    if (icon) icon.setAttribute("data-lucide", state.theme === "dark" ? "sun" : "moon");
    refreshIcons();
    setBaseLayer();
  }

  function clearAllLocalData() {
    storageRemove(STORAGE_KEYS.sosHistory);
    storageRemove(STORAGE_KEYS.userContacts);
    storageRemove(STORAGE_KEYS.crowdReports);
    storageRemove(STORAGE_KEYS.shelterEdits);
    storageRemove(STORAGE_KEYS.adminAddedShelters);
    state.sosHistory = [];
    state.userContacts = [];
    state.crowdReports = [];
    state.shelters = loadSheltersWithOverrides();
    Object.keys(state.reportMarkers).forEach(function (id) {
      try {
        state.map.removeLayer(state.reportMarkers[id]);
      } catch (e) {
        /* ignore */
      }
    });
    state.reportMarkers = {};
    renderShelterMarkers();
    renderUserContacts();
    renderCrowdReports();
    renderAdminShelterList();
    renderShelterListFull();
    showToast(t("toast_data_cleared"), "success");
  }

  /* =======================================================
     EVENT BINDING
  ======================================================= */

  function bindEvents() {
    document.getElementById("enableLocationBtn").addEventListener("click", requestLocation);
    document.getElementById("useDemoLocationBtn").addEventListener("click", useDemoLocation);

    document.getElementById("darkModeToggle").addEventListener("click", toggleDarkMode);

    document.getElementById("menuBtn").addEventListener("click", function (e) {
      e.stopPropagation();
      toggleMenu();
    });
    document.addEventListener("click", function (e) {
      var menu = document.getElementById("menuDropdown");
      if (!menu.classList.contains("hidden") && !menu.contains(e.target) && e.target.id !== "menuBtn") {
        closeMenu();
      }
    });
    document.getElementById("simulateDisasterBtn").addEventListener("click", function () {
      closeMenu();
      simulateDisaster();
    });
    document.getElementById("checkInMenuBtn").addEventListener("click", function () {
      closeMenu();
      switchView("contacts");
      performCheckIn();
    });
    document.getElementById("clearDataBtn").addEventListener("click", function () {
      closeMenu();
      clearAllLocalData();
    });

    document.getElementById("alertBannerClose").addEventListener("click", function () {
      document.getElementById("alertBanner").classList.add("hidden");
    });

    document.getElementById("langSelect").addEventListener("change", function (e) {
      state.lang = e.target.value;
      storageSet(STORAGE_KEYS.lang, state.lang);
      applyI18n();
    });

    document.querySelectorAll(".disaster-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        setActiveDisaster(chip.getAttribute("data-disaster"));
      });
    });

    document.getElementById("layerToggleBtn").addEventListener("click", toggleSatellite);
    document.getElementById("followModeBtn").addEventListener("click", toggleFollowMode);
    document.getElementById("locateMeBtn").addEventListener("click", flyToUser);
    document.getElementById("findSafestShelterBtn").addEventListener("click", findSafestShelter);

    document.getElementById("shelterSheetClose").addEventListener("click", closeShelterSheet);

    document.getElementById("safetyTipsClose").addEventListener("click", closeSafetyTips);

    var sosBtn = document.getElementById("sosBtn");
    sosBtn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      startSosHold();
    });
    sosBtn.addEventListener("pointerup", cancelSosHold);
    sosBtn.addEventListener("pointerleave", cancelSosHold);
    sosBtn.addEventListener("pointercancel", cancelSosHold);

    document.getElementById("sosResultClose").addEventListener("click", function () {
      closeModal("sosResultModal");
    });
    document.getElementById("sosWhatsappBtn").addEventListener("click", function () {
      shareViaWhatsapp(state.lastSosMessage || "");
    });
    document.getElementById("sosSmsBtn").addEventListener("click", function () {
      shareViaSms(state.lastSosMessage || "");
    });
    document.getElementById("sosCopyBtn").addEventListener("click", function () {
      copyToClipboard(state.lastSosMessage || "");
    });
    document.getElementById("sosShareBtn").addEventListener("click", function () {
      shareViaWebShare(state.lastSosMessage || "");
    });

    document.getElementById("checkInResultClose").addEventListener("click", function () {
      closeModal("checkInResultModal");
    });
    document.getElementById("checkInBtn").addEventListener("click", performCheckIn);
    document.getElementById("checkInWhatsappBtn").addEventListener("click", function () {
      shareViaWhatsapp(state.lastCheckInMessage || "");
    });
    document.getElementById("checkInSmsBtn").addEventListener("click", function () {
      shareViaSms(state.lastCheckInMessage || "");
    });
    document.getElementById("checkInCopyBtn").addEventListener("click", function () {
      copyToClipboard(state.lastCheckInMessage || "");
    });
    document.getElementById("checkInShareBtn").addEventListener("click", function () {
      shareViaWebShare(state.lastCheckInMessage || "");
    });

    document.getElementById("addContactForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("contactNameInput").value.trim();
      var phone = document.getElementById("contactPhoneInput").value.trim();
      if (!name || !phone) return;
      addUserContact(name, phone);
      e.target.reset();
    });

    document.querySelectorAll(".report-type-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        submitReport(btn.getAttribute("data-report"));
      });
    });

    document.getElementById("adminAddShelterBtn").addEventListener("click", toggleAdminAddMode);

    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchView(btn.getAttribute("data-view"));
      });
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", updateOnlineChip);
    window.addEventListener("offline", updateOnlineChip);
    window.addEventListener("resize", function () {
      if (state.map) {
        try {
          state.map.invalidateSize();
        } catch (e) {
          /* ignore */
        }
      }
    });
  }

  /* =======================================================
     INIT
  ======================================================= */

  function init() {
    try {
      state.lang = storageGet(STORAGE_KEYS.lang, "en") || "en";
      state.theme = storageGet(STORAGE_KEYS.theme, "light") || "light";
      document.documentElement.setAttribute("data-theme", state.theme === "dark" ? "dark" : "light");
      var langSelect = document.getElementById("langSelect");
      if (langSelect) langSelect.value = state.lang;
      var darkIcon = document.getElementById("darkModeToggle").querySelector("i");
      if (darkIcon) darkIcon.setAttribute("data-lucide", state.theme === "dark" ? "sun" : "moon");

      state.sosHistory = storageGet(STORAGE_KEYS.sosHistory, []) || [];
      state.userContacts = storageGet(STORAGE_KEYS.userContacts, []) || [];
      state.crowdReports = storageGet(STORAGE_KEYS.crowdReports, []) || [];
      state.shelters = loadSheltersWithOverrides();

      bindEvents();
      initShelterSheetDrag();
      initMap();
      applyI18n();
      updateOnlineChip();
      updateGpsChip();
      renderSosHistory();
      renderCrowdReports();

      state.crowdReports.slice().reverse().forEach(function (entry) {
        addReportMarker(entry);
      });

      startAlertRotation();
      registerServiceWorker();
      refreshIcons();
    } catch (e) {
      showToast("Something went wrong while starting the app. Please reload.", "error");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
