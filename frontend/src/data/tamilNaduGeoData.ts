// ============================================================================
// TAMIL NADU COMPLETE GEOGRAPHY REGISTRY
// All 38 Districts → All Taluks with GPS Coordinate Pins
// Powers the 20 km Haversine Radius Order Filtering Engine
// ============================================================================

export interface TalukCoordinates {
  name: string;
  lat: number;
  lng: number;
}

export const TAMILNADU_COMPLETE_GEO: Record<string, TalukCoordinates[]> = {
  "TIRUVALLUR": [
    { name: "AVADI", lat: 13.1167, lng: 80.1000 },
    { name: "GUMMIDIPOONDI", lat: 13.4074, lng: 80.1204 },
    { name: "PALLIPET", lat: 13.4333, lng: 79.9333 },
    { name: "PONNERI", lat: 13.3236, lng: 80.1925 },
    { name: "POONAMALLEE", lat: 13.0473, lng: 80.0945 },
    { name: "R.K. PET", lat: 13.2323, lng: 79.6047 },
    { name: "TIRUTTANI", lat: 13.1812, lng: 79.6264 },
    { name: "TIRUVALLUR", lat: 13.1425, lng: 79.9079 },
    { name: "UTHUKOTTAI", lat: 13.3375, lng: 79.9114 }
  ],
  "CHENNAI": [
    { name: "ALANDUR", lat: 12.9975, lng: 80.2006 },
    { name: "AMBATTUR", lat: 13.1143, lng: 80.1548 },
    { name: "AMINJIKARAI", lat: 13.0722, lng: 80.2256 },
    { name: "AYANAVARAM", lat: 13.0950, lng: 80.2339 },
    { name: "EGMORE", lat: 13.0732, lng: 80.2602 },
    { name: "GUINDY", lat: 13.0067, lng: 80.2206 },
    { name: "KOLATHUR", lat: 13.1239, lng: 80.2202 },
    { name: "MADHAVARAM", lat: 13.1489, lng: 80.2314 },
    { name: "MADURAVOYAL", lat: 13.0494, lng: 80.1656 },
    { name: "MAMBALAM", lat: 13.0361, lng: 80.2217 },
    { name: "MYLAPORE", lat: 13.0330, lng: 80.2690 },
    { name: "PERAMBUR", lat: 13.1092, lng: 80.2458 },
    { name: "PURASAWALKAM", lat: 13.0906, lng: 80.2508 },
    { name: "SHOZHINGANALLUR", lat: 12.9014, lng: 80.2269 },
    { name: "THIRUVOTTIYUR", lat: 13.1600, lng: 80.3000 },
    { name: "TONDIARPET", lat: 13.1258, lng: 80.2886 },
    { name: "VELACHERY", lat: 12.9801, lng: 80.2228 }
  ],
  "KANCHEEPURAM": [
    { name: "KANCHEEPURAM", lat: 12.8342, lng: 79.7036 },
    { name: "KUNDRATHUR", lat: 12.9978, lng: 80.0972 },
    { name: "SRIPERUMBUDUR", lat: 12.9723, lng: 79.9520 },
    { name: "UTHIRAMERUR", lat: 12.6157, lng: 79.5544 },
    { name: "WALAJABAD", lat: 12.7933, lng: 79.7917 }
  ],
  "VELLORE": [
    { name: "ANAICUT", lat: 12.8767, lng: 78.9950 },
    { name: "GUDIYATHAM", lat: 12.9467, lng: 78.8711 },
    { name: "KATPADI", lat: 12.9833, lng: 79.1333 },
    { name: "K.V. KUPPAM", lat: 12.9878, lng: 79.0189 },
    { name: "PERNAMBUT", lat: 12.9344, lng: 78.7183 },
    { name: "VELLORE", lat: 12.9165, lng: 79.1325 }
  ],
  "DHARMAPURI": [
    { name: "DHARMAPURI", lat: 12.1354, lng: 78.1578 },
    { name: "HARUR", lat: 11.9056, lng: 78.4906 },
    { name: "KARIMANGALAM", lat: 12.3022, lng: 78.0125 },
    { name: "NALLAMPALLI", lat: 12.0622, lng: 78.1186 },
    { name: "PALACODE", lat: 12.2961, lng: 78.0786 },
    { name: "PAPPIREDDIPATTY", lat: 11.9367, lng: 78.3653 },
    { name: "PENNAGARAM", lat: 12.1333, lng: 77.9000 }
  ],
  "TIRUVANNAMALAI": [
    { name: "ARANI", lat: 12.6672, lng: 79.2839 },
    { name: "CHENGAM", lat: 12.3000, lng: 78.8000 },
    { name: "CHETPET", lat: 12.4492, lng: 79.3494 },
    { name: "CHEYYAR", lat: 12.6592, lng: 79.5419 },
    { name: "JAMUNAMARATHOOR", lat: 12.5517, lng: 78.9056 },
    { name: "KALASAPAKKAM", lat: 12.4172, lng: 79.0983 },
    { name: "KILPENNATHUR", lat: 12.2611, lng: 79.2242 },
    { name: "POLUR", lat: 12.5114, lng: 79.1219 },
    { name: "THANDARAMPATTU", lat: 12.1833, lng: 78.9333 },
    { name: "TIRUVANNAMALAI", lat: 12.2272, lng: 79.0711 },
    { name: "VANDAVASI", lat: 12.5000, lng: 79.6167 },
    { name: "VEMBAKKAM", lat: 12.6739, lng: 79.6450 }
  ],
  "VILLUPPURAM": [
    { name: "GINGEE", lat: 12.2533, lng: 79.4186 },
    { name: "KANDACHEEPURAM", lat: 11.9961, lng: 79.3094 },
    { name: "MARAKKANAM", lat: 12.1936, lng: 79.9442 },
    { name: "MELMALAIYANOOR", lat: 12.3456, lng: 79.2811 },
    { name: "THIRUVENNAINALLUR", lat: 11.8594, lng: 79.4264 },
    { name: "TINDIVANAM", lat: 12.2294, lng: 79.6500 },
    { name: "VANUR", lat: 11.9903, lng: 79.7214 },
    { name: "VIKRAVANDI", lat: 12.0353, lng: 79.5528 },
    { name: "VILUPPURAM", lat: 11.9401, lng: 79.4861 }
  ],
  "SALEM": [
    { name: "ATTUR", lat: 11.5975, lng: 78.5983 },
    { name: "EDAPPADY", lat: 11.5800, lng: 77.8500 },
    { name: "GANGAVALLI", lat: 11.4833, lng: 78.6500 },
    { name: "KADAYAMPATTI", lat: 11.8889, lng: 78.1147 },
    { name: "METTUR", lat: 11.7862, lng: 77.8008 },
    { name: "OMALUR", lat: 11.7333, lng: 78.0500 },
    { name: "PETHANAICKENPALAYAM", lat: 11.6917, lng: 78.5028 },
    { name: "SALEM", lat: 11.6643, lng: 78.1460 },
    { name: "SALEM SOUTH", lat: 11.6212, lng: 78.1502 },
    { name: "SALEM WEST", lat: 11.6736, lng: 78.0933 },
    { name: "SANKARI", lat: 11.4833, lng: 77.8833 },
    { name: "THALAIVASAL", lat: 11.6258, lng: 78.7522 },
    { name: "VALAPADY", lat: 11.6500, lng: 78.3833 },
    { name: "YERCAUD", lat: 11.7833, lng: 78.2000 }
  ],
  "NAMAKKAL": [
    { name: "KOLLI HILLS", lat: 11.2754, lng: 78.3372 },
    { name: "KUMARAPALAYAM", lat: 11.4500, lng: 77.7200 },
    { name: "MOHANUR", lat: 11.0453, lng: 78.1481 },
    { name: "NAMAKKAL", lat: 11.2189, lng: 78.1672 },
    { name: "PARAMATHIVELUR", lat: 11.1114, lng: 78.0108 },
    { name: "RASIPURAM", lat: 11.4667, lng: 78.1667 },
    { name: "SENDAMANGALAM", lat: 11.2833, lng: 78.2333 },
    { name: "THIRUCHENCODE", lat: 11.3833, lng: 77.9000 }
  ],
  "ERODE": [
    { name: "ANTHIYUR", lat: 11.5800, lng: 77.6000 },
    { name: "BHAVANI", lat: 11.4475, lng: 77.6839 },
    { name: "ERODE", lat: 11.3410, lng: 77.7172 },
    { name: "GOBICHETTIPALAYAM", lat: 11.4533, lng: 77.4419 },
    { name: "KODUMUDI", lat: 11.0833, lng: 77.8833 },
    { name: "MODAKKURICHI", lat: 11.2764, lng: 77.7553 },
    { name: "NAMBIYUR", lat: 11.4044, lng: 77.3325 },
    { name: "PERUNDURAI", lat: 11.2742, lng: 77.5833 },
    { name: "SATHYAMANGALAM", lat: 11.5022, lng: 77.2436 },
    { name: "THALAVADI", lat: 11.8028, lng: 77.2186 }
  ],
  "NILGIRIS": [
    { name: "COONOOR", lat: 11.3530, lng: 76.7950 },
    { name: "GUDALUR", lat: 11.5033, lng: 76.4933 },
    { name: "KOTAGIRI", lat: 11.4333, lng: 76.8833 },
    { name: "KUNDAH", lat: 11.2325, lng: 76.6214 },
    { name: "PANDALUR", lat: 11.4889, lng: 76.3314 },
    { name: "UDHAGAI", lat: 11.4089, lng: 76.6939 }
  ],
  "COIMBATORE": [
    { name: "ANAIMALAI", lat: 10.5833, lng: 76.9333 },
    { name: "ANNUR", lat: 11.2333, lng: 77.1000 },
    { name: "COIMBATORE (N)", lat: 11.0300, lng: 76.9500 },
    { name: "COIMBATORE (S)", lat: 10.9900, lng: 76.9600 },
    { name: "KINATHUKADAVU", lat: 10.8167, lng: 77.0167 },
    { name: "MADUKKARAI", lat: 10.9044, lng: 76.9633 },
    { name: "METTUPALAYAM", lat: 11.3000, lng: 76.9500 },
    { name: "PERUR", lat: 10.9517, lng: 76.9142 },
    { name: "POLLACHI", lat: 10.6594, lng: 77.0094 },
    { name: "SULUR", lat: 11.0267, lng: 77.1242 },
    { name: "VALPARAI", lat: 10.3275, lng: 76.9556 }
  ],
  "DINDIGUL": [
    { name: "ATHOOR", lat: 10.2833, lng: 77.8333 },
    { name: "DINDIGUL EAST", lat: 10.3667, lng: 78.0000 },
    { name: "DINDIGUL WEST", lat: 10.3600, lng: 77.9500 },
    { name: "GUJILIAMPARAI", lat: 10.7028, lng: 78.1189 },
    { name: "KODAIKANAL", lat: 10.2381, lng: 77.4892 },
    { name: "NATHAM", lat: 10.2167, lng: 78.2333 },
    { name: "NILAKOTTAI", lat: 10.1667, lng: 77.8500 },
    { name: "ODDENCHATRAM", lat: 10.4833, lng: 77.7500 },
    { name: "PALANI", lat: 10.4500, lng: 77.5167 },
    { name: "VEDASANDUR", lat: 10.5333, lng: 77.9333 }
  ],
  "KARUR": [
    { name: "ARVAKURICHI", lat: 10.7667, lng: 77.9167 },
    { name: "AYYARMALAI", lat: 10.8930, lng: 78.3840 },
    { name: "KADAVUR", lat: 10.5974, lng: 78.2144 },
    { name: "KARUR", lat: 10.9601, lng: 78.0766 },
    { name: "KRISHNARAYAPURAM", lat: 10.9419, lng: 78.2778 },
    { name: "KULITHALAI", lat: 10.9390, lng: 78.4140 },
    { name: "MANMANGALAM", lat: 11.0153, lng: 78.0817 },
    { name: "PUGALUR", lat: 11.0664, lng: 77.9944 }
  ],
  "THIRUCHIRAPPALLI": [
    { name: "LALGUDI", lat: 10.8667, lng: 78.8333 },
    { name: "MANACHANALLUR", lat: 10.9067, lng: 78.7017 },
    { name: "MANAPPARAI", lat: 10.6067, lng: 78.4167 },
    { name: "MARUNGAPURI", lat: 10.4356, lng: 78.4350 },
    { name: "MUSIRI", lat: 10.9333, lng: 78.4500 },
    { name: "SRIRANGAM", lat: 10.8620, lng: 78.6900 },
    { name: "THIRUVERUMBUR", lat: 10.7936, lng: 78.7733 },
    { name: "THOTTIAM", lat: 10.9667, lng: 78.3333 },
    { name: "THURAIYUR", lat: 11.1422, lng: 78.5956 },
    { name: "TIRUCHIRAPPALLI EAST", lat: 10.8100, lng: 78.7100 },
    { name: "TIRUCHIRAPPALLI WEST", lat: 10.8120, lng: 78.6900 }
  ],
  "PERAMBALUR": [
    { name: "ALATHUR", lat: 11.1428, lng: 78.8922 },
    { name: "KUNNAM", lat: 11.2333, lng: 79.0167 },
    { name: "PERAMBALUR", lat: 11.2333, lng: 78.8833 },
    { name: "VEPPANTHATTAI", lat: 11.3283, lng: 78.8356 }
  ],
  "ARIYALUR": [
    { name: "ANDIMADAM", lat: 11.3325, lng: 79.3789 },
    { name: "ARIYALUR", lat: 11.1389, lng: 79.0736 },
    { name: "SENDURAI", lat: 11.2467, lng: 79.1725 },
    { name: "UDAYARPALAYAM", lat: 11.1833, lng: 79.3000 }
  ],
  "CUDDALORE": [
    { name: "BHUVANAGIRI", lat: 11.4589, lng: 79.6417 },
    { name: "CHIDAMBARAM", lat: 11.3986, lng: 79.6953 },
    { name: "CUDDALORE", lat: 11.7480, lng: 79.7714 },
    { name: "KATTUMANNARKOIL", lat: 11.2778, lng: 79.5539 },
    { name: "KURINJIPADI", lat: 11.5667, lng: 79.6000 },
    { name: "PANRUTI", lat: 11.7667, lng: 79.5500 },
    { name: "SRIMUSHNAM", lat: 11.3789, lng: 79.4128 },
    { name: "TITAGUDI", lat: 11.4500, lng: 78.9833 },
    { name: "VEPPUR", lat: 11.5369, lng: 79.1233 },
    { name: "VRIDHACHALAM", lat: 11.5167, lng: 79.3333 }
  ],
  "NAGAPATTINAM": [
    { name: "KILVELUR", lat: 10.7167, lng: 79.7667 },
    { name: "NAGAPATTINAM", lat: 10.7656, lng: 79.8428 },
    { name: "THIRUKKUVALAI", lat: 10.6128, lng: 79.7344 },
    { name: "VEDARANYAM", lat: 10.3744, lng: 79.8453 }
  ],
  "THIRUVARUR": [
    { name: "KOOTHANALLUR", lat: 10.7222, lng: 79.5217 },
    { name: "KUDAVASAL", lat: 10.8756, lng: 79.4917 },
    { name: "MANNARGUDI", lat: 10.6625, lng: 79.4444 },
    { name: "MUTHUPETTAI", lat: 10.4000, lng: 79.4833 },
    { name: "NANNILAM", lat: 10.8872, lng: 79.6156 },
    { name: "NEEDAMANGALAM", lat: 10.7719, lng: 79.4125 },
    { name: "THIRUTHURAIPOONDI", lat: 10.5333, lng: 79.6333 },
    { name: "THIRUVARUR", lat: 10.7744, lng: 79.6339 },
    { name: "VALANGAIMAN", lat: 10.8906, lng: 79.3853 }
  ],
  "THANJAVUR": [
    { name: "BUDALUR", lat: 10.8358, lng: 78.9667 },
    { name: "KUMBAKONAM", lat: 10.9617, lng: 79.3881 },
    { name: "ORATHANAD", lat: 10.6272, lng: 79.2611 },
    { name: "PAPANASAM", lat: 10.9264, lng: 79.2736 },
    { name: "PATTUKKOTAI", lat: 10.4261, lng: 79.3217 },
    { name: "PERAVURANI", lat: 10.2372, lng: 79.1833 },
    { name: "THANJAVUR", lat: 10.7870, lng: 79.1378 },
    { name: "THIRUVAIYARU", lat: 10.8789, lng: 79.1039 },
    { name: "THIRUVIDAIMARUDUR", lat: 10.9944, lng: 79.4678 },
    { name: "THIRUVONAM", lat: 10.4939, lng: 79.1678 }
  ],
  "PUDUKKOTTAI": [
    { name: "ALANGUDI", lat: 10.3667, lng: 78.9833 },
    { name: "ARANTHANGI", lat: 10.1667, lng: 78.9958 },
    { name: "AVUDAIYARKOIL", lat: 10.0764, lng: 79.0439 },
    { name: "GANDARVAKOTTAI", lat: 10.5636, lng: 79.0308 },
    { name: "ILLUPUR", lat: 10.5122, lng: 78.6314 },
    { name: "KARAMBAKUDI", lat: 10.4636, lng: 79.1344 },
    { name: "KULATHUR", lat: 10.6322, lng: 78.7889 },
    { name: "MANAMELKUDI", lat: 9.9286, lng: 79.1364 },
    { name: "PONNAMARAVATHI", lat: 10.2333, lng: 78.6167 },
    { name: "PUDUKKOTTAI", lat: 10.3797, lng: 78.8239 },
    { name: "THIRUMAYAM", lat: 10.2458, lng: 78.7564 },
    { name: "VIRALIMALAI", lat: 10.6033, lng: 78.5367 }
  ],
  "SIVAGANGAI": [
    { name: "DEVAKOTTAI", lat: 9.9472, lng: 78.8258 },
    { name: "KALAIYARKOVIL", lat: 9.8436, lng: 78.6283 },
    { name: "ILAYANKUDI", lat: 9.6333, lng: 78.6333 },
    { name: "KARAIKUDI", lat: 10.0736, lng: 78.7731 },
    { name: "MANAMADURAI", lat: 9.7042, lng: 78.4514 },
    { name: "SINGAMPUNARI", lat: 10.1839, lng: 78.4239 },
    { name: "SIVAGANGA", lat: 9.8433, lng: 78.4833 },
    { name: "THIRUPPATTUR", lat: 10.1167, lng: 78.4833 },
    { name: "THIRUPPUVANAM", lat: 9.8633, lng: 78.2678 }
  ],
  "MADURAI": [
    { name: "KALLIGUDI", lat: 9.6917, lng: 78.0125 },
    { name: "MADURAI EAST", lat: 9.9320, lng: 78.1500 },
    { name: "MADURAI NORTH", lat: 9.9350, lng: 78.1250 },
    { name: "MADURAI SOUTH", lat: 9.9195, lng: 78.1193 },
    { name: "MADURAI WEST", lat: 9.9280, lng: 78.0900 },
    { name: "MELUR", lat: 10.0500, lng: 78.3333 },
    { name: "PERAIYUR", lat: 9.7167, lng: 77.8000 },
    { name: "THIRUPPARANKUNDRAM", lat: 9.8808, lng: 78.0722 },
    { name: "TIRUMANGALAM", lat: 9.8242, lng: 78.0053 },
    { name: "USILAMPATTI", lat: 9.9667, lng: 77.8000 },
    { name: "VADIPATTI", lat: 10.0833, lng: 77.9667 }
  ],
  "THENI": [
    { name: "AUNDIPATTI", lat: 9.9833, lng: 77.6833 },
    { name: "BODINAYAKKANUR", lat: 10.0103, lng: 77.3517 },
    { name: "PERIYAKULAM", lat: 10.1167, lng: 77.5500 },
    { name: "THENI", lat: 10.0100, lng: 77.4700 },
    { name: "UTHAMAPALAYAM", lat: 9.8167, lng: 77.3333 }
  ],
  "VIRUDHUNAGAR": [
    { name: "ARUPPUKKOTTAI", lat: 9.5122, lng: 78.1008 },
    { name: "KARIYAPATTI", lat: 9.5592, lng: 78.1033 },
    { name: "RAJAPALAIAM", lat: 9.4539, lng: 77.5556 },
    { name: "SATTUR", lat: 9.3567, lng: 77.9250 },
    { name: "SIVAKASI", lat: 9.4533, lng: 77.8017 },
    { name: "SRIVILLIPUTHUR", lat: 9.5092, lng: 77.6322 },
    { name: "TIRUCHULI", lat: 9.5319, lng: 78.2047 },
    { name: "VEMBAKKOTTAI", lat: 9.3364, lng: 77.7772 },
    { name: "VIRUDHUNAGAR", lat: 9.5872, lng: 77.9514 },
    { name: "WATRAP", lat: 9.6139, lng: 77.6417 }
  ],
  "RAMANATHAPURAM": [
    { name: "KADALADI", lat: 9.2333, lng: 78.4333 },
    { name: "KAMUTHI", lat: 9.4069, lng: 78.3756 },
    { name: "KILAKARAI", lat: 9.2319, lng: 78.7836 },
    { name: "MUDUKULATHUR", lat: 9.3347, lng: 78.5086 },
    { name: "PARAMAKUDI", lat: 9.5447, lng: 78.5919 },
    { name: "RAJASINGAMANGALAM", lat: 9.6192, lng: 78.7456 },
    { name: "RAMANATHAPURAM", lat: 9.3639, lng: 78.8394 },
    { name: "RAMESHWARAM", lat: 9.2881, lng: 79.3122 },
    { name: "THIRUVADANI", lat: 9.5833, lng: 78.9167 }
  ],
  "THOOTHUKKUDI": [
    { name: "ERAL", lat: 8.6319, lng: 78.0167 },
    { name: "ETTAYAPURAM", lat: 9.1500, lng: 77.9944 },
    { name: "KAYATHAR", lat: 8.9483, lng: 77.7289 },
    { name: "KOVILPATTI", lat: 9.1700, lng: 77.8700 },
    { name: "OTTAPIDARAM", lat: 8.9000, lng: 78.0167 },
    { name: "SATTANKULAM", lat: 8.4414, lng: 77.9147 },
    { name: "SRIVAIKUNDAM", lat: 8.6419, lng: 77.9094 },
    { name: "THOOTHUKUDI", lat: 8.7642, lng: 78.1344 },
    { name: "TIRUCHENDUR", lat: 8.4900, lng: 78.1200 },
    { name: "VILATHIKULAM", lat: 9.1333, lng: 78.1667 }
  ],
  "TIRUNELVELI": [
    { name: "AMBASAMUDRAM", lat: 8.7083, lng: 77.4561 },
    { name: "CHERANMAHADEVI", lat: 8.6792, lng: 77.5614 },
    { name: "MANUR", lat: 8.8167, lng: 77.6500 },
    { name: "NANGUNERI", lat: 8.4878, lng: 77.6533 },
    { name: "PALAYAMKOTTAI", lat: 8.7189, lng: 77.7336 },
    { name: "RADHAPURAM", lat: 8.2667, lng: 77.6833 },
    { name: "THISAYANVILAI", lat: 8.3242, lng: 77.8789 },
    { name: "TIRUNELVELI", lat: 8.7284, lng: 77.7035 }
  ],
  "KANYAKUMARI": [
    { name: "AGASTHEESWARAM", lat: 8.1667, lng: 77.4667 },
    { name: "KALKULAM", lat: 8.2833, lng: 77.3167 },
    { name: "KILLIYOOR", lat: 8.2725, lng: 77.2289 },
    { name: "THIRUVATTAR", lat: 8.3289, lng: 77.2711 },
    { name: "THOVALAI", lat: 8.2750, lng: 77.4528 },
    { name: "VILAVAMCODE", lat: 8.3333, lng: 77.2167 }
  ],
  "KRISHNAGIRI": [
    { name: "ANCHETTY", lat: 12.3125, lng: 77.7667 },
    { name: "BARGUR", lat: 12.5186, lng: 78.3614 },
    { name: "DENKANIKOTTAI", lat: 12.5208, lng: 77.7806 },
    { name: "HOSUR", lat: 12.7408, lng: 77.8253 },
    { name: "KRISHNAGIRI", lat: 12.5266, lng: 78.2147 },
    { name: "POCHAMPALLI", lat: 12.3314, lng: 78.3719 },
    { name: "SHOOLAGIRI", lat: 12.6681, lng: 77.9944 },
    { name: "UTHANGARAI", lat: 12.2689, lng: 78.5367 }
  ],
  "TIRUPPUR": [
    { name: "AVINASHI", lat: 11.1922, lng: 77.2694 },
    { name: "DHARAPURAM", lat: 10.7300, lng: 77.5200 },
    { name: "KANGAYAM", lat: 11.0056, lng: 77.5644 },
    { name: "MADATHUKULAM", lat: 10.5517, lng: 77.3611 },
    { name: "PALLADAM", lat: 10.9833, lng: 77.2833 },
    { name: "TIRUPPUR NORTH", lat: 11.1350, lng: 77.3450 },
    { name: "TIRUPPUR SOUTH", lat: 11.0820, lng: 77.3580 },
    { name: "UDUMALAIPET", lat: 10.5847, lng: 77.2436 },
    { name: "UTHUKKULI", lat: 11.1667, lng: 77.4500 }
  ],
  "KALLAKURICHI": [
    { name: "CHINNASALEM", lat: 11.6508, lng: 78.8872 },
    { name: "KALLAKURICHI", lat: 11.7372, lng: 78.9628 },
    { name: "KALVARAYAN HILLS", lat: 11.7856, lng: 78.7189 },
    { name: "SANKARAPURAM", lat: 11.8894, lng: 78.9133 },
    { name: "TIRUKKOILUR", lat: 11.9564, lng: 79.2008 },
    { name: "ULUNDURPET", lat: 11.6894, lng: 79.2894 },
    { name: "VANAPURAM", lat: 11.9058, lng: 79.0319 }
  ],
  "TENKASI": [
    { name: "ALANGULAM", lat: 8.8694, lng: 77.5028 },
    { name: "KADAYANALLUR", lat: 9.0833, lng: 77.4167 },
    { name: "SANKARANKOIL", lat: 9.1722, lng: 77.5333 },
    { name: "SHENKOTTAI", lat: 8.9833, lng: 77.2667 },
    { name: "SIVAGIRI", lat: 9.3333, lng: 77.4333 },
    { name: "TENKASI", lat: 8.9594, lng: 77.3150 },
    { name: "THIRUVENGADAM", lat: 9.2158, lng: 77.6594 },
    { name: "VEERAKERALAMPUDUR", lat: 8.9483, lng: 77.4367 }
  ],
  "CHENGALPATTU": [
    { name: "CHENGALPATTU", lat: 12.6825, lng: 79.9836 },
    { name: "CHEYYUR", lat: 12.3558, lng: 80.0094 },
    { name: "MADURAMDAGAM", lat: 12.5117, lng: 79.8867 },
    { name: "PALLAVARAM", lat: 12.9675, lng: 80.1494 },
    { name: "TAMBARAM", lat: 12.9228, lng: 80.1278 },
    { name: "THIRUPORUR", lat: 12.7264, lng: 80.1872 },
    { name: "TIRUKALUKUNDRAM", lat: 12.6125, lng: 80.0544 },
    { name: "VANDALUR", lat: 12.8914, lng: 80.0808 }
  ],
  "THIRUPATHUR": [
    { name: "AMBUR", lat: 12.7906, lng: 78.7156 },
    { name: "NATARAMPALLI", lat: 12.6319, lng: 78.5528 },
    { name: "TIRUPATHUR", lat: 12.4925, lng: 78.5678 },
    { name: "VANIYAMBADI", lat: 12.6864, lng: 78.6186 }
  ],
  "RANIPET": [
    { name: "ARAKKONAM", lat: 13.0825, lng: 79.6694 },
    { name: "ARCOT", lat: 12.9042, lng: 79.3336 },
    { name: "KALAVAI", lat: 12.7667, lng: 79.2833 },
    { name: "NEMILI", lat: 13.0189, lng: 79.6450 },
    { name: "SHOLINGHUR", lat: 13.1119, lng: 79.4219 },
    { name: "WALAJAPET", lat: 12.9292, lng: 79.3564 }
  ],
  "MAYILADUTHURAI": [
    { name: "KUTHALAM", lat: 10.9933, lng: 79.5606 },
    { name: "MAYILADUTHURAI", lat: 11.1017, lng: 79.6519 },
    { name: "SIRKAZHI", lat: 11.2394, lng: 79.7344 },
    { name: "THARANGAMBADI", lat: 11.0319, lng: 79.8431 }
  ]
};

// ============================================================================
// HAVERSINE DISTANCE CALCULATOR (Pure function — zero side effects)
// Returns distance in kilometers between two GPS coordinate points
// ============================================================================
export const getHaversineDistanceKM = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ============================================================================
// DISTRICT KEYS SORTED ALPHABETICALLY (Utility for consistent dropdown ordering)
// ============================================================================
export const SORTED_DISTRICT_KEYS = Object.keys(TAMILNADU_COMPLETE_GEO).sort();
