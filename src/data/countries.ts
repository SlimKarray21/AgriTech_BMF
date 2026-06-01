export interface Governorate {
  name: string;
  cities: string[];
}

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  governorates: Governorate[];
}

export const countries: Country[] = [
  {
    code: "TN", name: "Tunisie", dialCode: "+216",
    governorates: [
      { name: "Tunis", cities: ["Tunis", "La Marsa", "Le Bardo", "Carthage", "Sidi Bou Said"] },
      { name: "Ariana", cities: ["Ariana", "La Soukra", "Raoued", "Sidi Thabet", "Mnihla"] },
      { name: "Ben Arous", cities: ["Ben Arous", "Hammam Lif", "Hammam Chatt", "Radès", "Mohamedia"] },
      { name: "Manouba", cities: ["Manouba", "Douar Hicher", "Oued Ellil", "Tebourba", "El Battane"] },
      { name: "Nabeul", cities: ["Nabeul", "Hammamet", "Kélibia", "Korba", "Dar Chaabane", "Grombalia", "Soliman", "Menzel Temime"] },
      { name: "Zaghouan", cities: ["Zaghouan", "Zriba", "El Fahs", "Bir Mcherga"] },
      { name: "Bizerte", cities: ["Bizerte", "Menzel Bourguiba", "Mateur", "Ras Jebel", "Sejnane", "Utique"] },
      { name: "Béja", cities: ["Béja", "Medjez el-Bab", "Nefza", "Testour", "Téboursouk"] },
      { name: "Jendouba", cities: ["Jendouba", "Tabarka", "Aïn Draham", "Bou Salem", "Ghardimaou"] },
      { name: "Kef", cities: ["Le Kef", "Dahmani", "Tajerouine", "Sakiet Sidi Youssef", "Nebeur"] },
      { name: "Siliana", cities: ["Siliana", "Bou Arada", "Gaâfour", "Makthar", "Kesra"] },
      { name: "Sousse", cities: ["Sousse", "M'saken", "Kalaa Kebira", "Hammam Sousse", "Akouda", "Enfidha"] },
      { name: "Monastir", cities: ["Monastir", "Moknine", "Jemmal", "Ksar Hellal", "Sahline", "Bembla"] },
      { name: "Mahdia", cities: ["Mahdia", "Ksour Essef", "El Jem", "Chebba", "Bou Merdes"] },
      { name: "Sfax", cities: ["Sfax", "Sakiet Ezzit", "Sakiet Eddaïer", "Agareb", "Bir Ali Ben Khalifa", "Mahrès", "Jbeniana", "Kerkennah"] },
      { name: "Kairouan", cities: ["Kairouan", "Haffouz", "Sbikha", "Nasrallah", "Hajeb El Ayoun"] },
      { name: "Kasserine", cities: ["Kasserine", "Sbeitla", "Feriana", "Thala", "Foussana"] },
      { name: "Sidi Bouzid", cities: ["Sidi Bouzid", "Regueb", "Jilma", "Menzel Bouzaiane", "Meknassy"] },
      { name: "Gabès", cities: ["Gabès", "El Hamma", "Mareth", "Matmata", "Ghannouch"] },
      { name: "Médenine", cities: ["Médenine", "Djerba", "Zarzis", "Ben Gardane", "Beni Khedache"] },
      { name: "Tataouine", cities: ["Tataouine", "Ghomrassen", "Remada", "Dehiba", "Bir Lahmar"] },
      { name: "Gafsa", cities: ["Gafsa", "Metlaoui", "Redeyef", "Moularès", "El Guettar"] },
      { name: "Tozeur", cities: ["Tozeur", "Nefta", "Degache", "Tamerza"] },
      { name: "Kébili", cities: ["Kébili", "Douz", "Souk Lahad", "El Faouar"] },
    ],
  },
  {
    code: "FR", name: "France", dialCode: "+33",
    governorates: [
      { name: "Île-de-France", cities: ["Paris", "Boulogne-Billancourt", "Saint-Denis", "Versailles"] },
      { name: "Provence-Alpes-Côte d'Azur", cities: ["Marseille", "Nice", "Toulon", "Aix-en-Provence"] },
      { name: "Auvergne-Rhône-Alpes", cities: ["Lyon", "Grenoble", "Saint-Étienne", "Clermont-Ferrand"] },
      { name: "Occitanie", cities: ["Toulouse", "Montpellier", "Nîmes", "Perpignan"] },
      { name: "Nouvelle-Aquitaine", cities: ["Bordeaux", "Limoges", "Poitiers", "Pau"] },
      { name: "Hauts-de-France", cities: ["Lille", "Amiens", "Roubaix", "Tourcoing"] },
      { name: "Grand Est", cities: ["Strasbourg", "Reims", "Metz", "Mulhouse"] },
      { name: "Pays de la Loire", cities: ["Nantes", "Angers", "Le Mans", "Saint-Nazaire"] },
    ],
  },
  {
    code: "DZ", name: "Algérie", dialCode: "+213",
    governorates: [
      { name: "Alger", cities: ["Alger", "Bab El Oued", "Hussein Dey", "Bir Mourad Raïs"] },
      { name: "Oran", cities: ["Oran", "Aïn El Turck", "Es Sénia", "Bir El Djir"] },
      { name: "Constantine", cities: ["Constantine", "El Khroub", "Aïn Smara", "Hamma Bouziane"] },
      { name: "Annaba", cities: ["Annaba", "El Bouni", "Berrahal", "El Hadjar"] },
      { name: "Blida", cities: ["Blida", "Boufarik", "Bougara", "Mouzaïa"] },
      { name: "Sétif", cities: ["Sétif", "El Eulma", "Aïn Oulmene", "Aïn Arnat"] },
    ],
  },
  {
    code: "MA", name: "Maroc", dialCode: "+212",
    governorates: [
      { name: "Casablanca-Settat", cities: ["Casablanca", "Mohammedia", "El Jadida", "Settat"] },
      { name: "Rabat-Salé-Kénitra", cities: ["Rabat", "Salé", "Kénitra", "Témara"] },
      { name: "Fès-Meknès", cities: ["Fès", "Meknès", "Taza", "Ifrane"] },
      { name: "Marrakech-Safi", cities: ["Marrakech", "Safi", "Essaouira", "El Kelâa des Sraghna"] },
      { name: "Tanger-Tétouan-Al Hoceïma", cities: ["Tanger", "Tétouan", "Al Hoceïma", "Larache"] },
    ],
  },
  {
    code: "LY", name: "Libye", dialCode: "+218",
    governorates: [
      { name: "Tripoli", cities: ["Tripoli", "Tajura", "Janzour"] },
      { name: "Benghazi", cities: ["Benghazi", "Gmines", "Soluq"] },
      { name: "Misrata", cities: ["Misrata", "Zliten", "Bani Walid"] },
    ],
  },
  {
    code: "EG", name: "Égypte", dialCode: "+20",
    governorates: [
      { name: "Le Caire", cities: ["Le Caire", "Héliopolis", "Maadi", "Nasr City"] },
      { name: "Alexandrie", cities: ["Alexandrie", "Borg El Arab", "Montazah"] },
      { name: "Gizeh", cities: ["Gizeh", "6 Octobre", "Sheikh Zayed"] },
    ],
  },
  {
    code: "SA", name: "Arabie Saoudite", dialCode: "+966",
    governorates: [
      { name: "Riyad", cities: ["Riyad", "Al Kharj", "Diriyah"] },
      { name: "La Mecque", cities: ["La Mecque", "Djeddah", "Taïf"] },
      { name: "Médine", cities: ["Médine", "Yanbu", "Badr"] },
    ],
  },
  {
    code: "AE", name: "Émirats arabes unis", dialCode: "+971",
    governorates: [
      { name: "Dubaï", cities: ["Dubaï"] },
      { name: "Abu Dhabi", cities: ["Abu Dhabi", "Al Ain"] },
      { name: "Charjah", cities: ["Charjah"] },
    ],
  },
  {
    code: "US", name: "États-Unis", dialCode: "+1",
    governorates: [
      { name: "California", cities: ["Los Angeles", "San Francisco", "San Diego", "Sacramento"] },
      { name: "New York", cities: ["New York", "Buffalo", "Albany", "Rochester"] },
      { name: "Texas", cities: ["Houston", "Dallas", "Austin", "San Antonio"] },
      { name: "Illinois", cities: ["Chicago", "Springfield", "Aurora"] },
    ],
  },
  {
    code: "DE", name: "Allemagne", dialCode: "+49",
    governorates: [
      { name: "Berlin", cities: ["Berlin"] },
      { name: "Bavière", cities: ["Munich", "Nuremberg", "Augsbourg"] },
      { name: "Hambourg", cities: ["Hambourg"] },
      { name: "Hesse", cities: ["Francfort", "Wiesbaden", "Kassel"] },
    ],
  },
  {
    code: "IT", name: "Italie", dialCode: "+39",
    governorates: [
      { name: "Latium", cities: ["Rome", "Latina", "Viterbe"] },
      { name: "Lombardie", cities: ["Milan", "Bergame", "Brescia"] },
      { name: "Campanie", cities: ["Naples", "Salerne", "Caserte"] },
    ],
  },
  {
    code: "ES", name: "Espagne", dialCode: "+34",
    governorates: [
      { name: "Madrid", cities: ["Madrid", "Alcalá de Henares", "Getafe"] },
      { name: "Catalogne", cities: ["Barcelone", "Gérone", "Tarragone"] },
      { name: "Andalousie", cities: ["Séville", "Málaga", "Grenade", "Cordoue"] },
    ],
  },
  {
    code: "TR", name: "Turquie", dialCode: "+90",
    governorates: [
      { name: "Istanbul", cities: ["Istanbul"] },
      { name: "Ankara", cities: ["Ankara"] },
      { name: "Izmir", cities: ["Izmir", "Bornova", "Karşıyaka"] },
      { name: "Antalya", cities: ["Antalya", "Alanya", "Manavgat"] },
    ],
  },
];
