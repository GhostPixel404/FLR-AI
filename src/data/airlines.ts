// Major airlines by ICAO callsign prefix (the first 3 letters of the flight
// callsign). Used to label aircraft with a human airline name so the assistant
// can answer "nearest Emirates" etc. directly from the on-screen snapshot.
export const AIRLINES: Record<string, string> = {
  UAE: 'Emirates', QTR: 'Qatar Airways', ETD: 'Etihad', GFA: 'Gulf Air', SVA: 'Saudia',
  ABY: 'Air Arabia', FDB: 'flydubai', KAC: 'Kuwait Airways', OMA: 'Oman Air', RJA: 'Royal Jordanian',
  BAW: 'British Airways', VIR: 'Virgin Atlantic', EZY: 'easyJet', RYR: 'Ryanair', EXS: 'Jet2',
  TOM: 'TUI Airways', DLH: 'Lufthansa', CLH: 'Lufthansa CityLine', AFR: 'Air France', KLM: 'KLM',
  SWR: 'Swiss', AUA: 'Austrian', BEL: 'Brussels Airlines', IBE: 'Iberia', IBS: 'Iberia Express',
  VLG: 'Vueling', TAP: 'TAP Air Portugal', SAS: 'SAS', FIN: 'Finnair', NAX: 'Norwegian',
  LOT: 'LOT Polish', CSA: 'Czech Airlines', AEE: 'Aegean', THY: 'Turkish Airlines', PGT: 'Pegasus',
  AFL: 'Aeroflot', SDM: 'Rossiya', WZZ: 'Wizz Air', EWG: 'Eurowings', CFG: 'Condor',
  UAL: 'United', AAL: 'American', DAL: 'Delta', SWA: 'Southwest', JBU: 'JetBlue',
  ASA: 'Alaska Airlines', NKS: 'Spirit', FFT: 'Frontier', ACA: 'Air Canada', WJA: 'WestJet',
  AMX: 'Aeroméxico', VOI: 'Volaris', TAM: 'LATAM Brasil', LAN: 'LATAM', GLO: 'GOL', AZU: 'Azul',
  AVA: 'Avianca', CMP: 'Copa', SIA: 'Singapore Airlines', CPA: 'Cathay Pacific', QFA: 'Qantas',
  JST: 'Jetstar', VOZ: 'Virgin Australia', ANZ: 'Air New Zealand', ANA: 'All Nippon', JAL: 'Japan Airlines',
  KAL: 'Korean Air', AAR: 'Asiana', CCA: 'Air China', CES: 'China Eastern', CSN: 'China Southern',
  CHH: 'Hainan Airlines', CSZ: 'Shenzhen Airlines', CXA: 'XiamenAir', CAL: 'China Airlines', EVA: 'EVA Air',
  THA: 'Thai Airways', AIQ: 'Thai AirAsia', AXM: 'AirAsia', MAS: 'Malaysia Airlines', GIA: 'Garuda',
  AWQ: 'Indonesia AirAsia', PAL: 'Philippine Airlines', CEB: 'Cebu Pacific', HVN: 'Vietnam Airlines', VJC: 'VietJet',
  AIC: 'Air India', IGO: 'IndiGo', SEJ: 'SpiceJet', AKJ: 'Akasa Air', VTI: 'Vistara',
  MSR: 'EgyptAir', ETH: 'Ethiopian', RAM: 'Royal Air Maroc', KQA: 'Kenya Airways', DAH: 'Air Algérie',
  SAA: 'South African', ELY: 'El Al', UPS: 'UPS', FDX: 'FedEx', GTI: 'Atlas Air',
  ABX: 'ABX Air', BOX: 'AeroLogic', CLX: 'Cargolux', GEC: 'Lufthansa Cargo', WGN: 'Western Global',
  // Europe (regional / low-cost / charter)
  EIN: 'Aer Lingus', AEA: 'Air Europa', ANE: 'Air Nostrum', EJU: 'easyJet Europe', EZS: 'easyJet Switzerland',
  TRA: 'Transavia', TVF: 'Transavia France', SXS: 'SunExpress', ITY: 'ITA Airways', VOE: 'Volotea',
  EDW: 'Edelweiss', KLC: 'KLM Cityhopper', WIF: 'Widerøe', ROT: 'TAROM', TVS: 'Smartwings',
  LZB: 'Bulgaria Air', CTN: 'Croatia Airlines', ASL: 'Air Serbia', JAF: 'TUI fly Belgium', TFL: 'TUI fly Netherlands',
  WUK: 'Wizz Air UK', WMT: 'Wizz Air Malta', LOG: 'Loganair', BCY: 'CityJet', NSZ: 'Norse Atlantic',
  RUK: 'Ryanair UK', OHY: 'Onur Air', FHY: 'Freebird', AHO: 'Air Corsica', OCN: 'Discover Airlines',
  DLA: 'Air Dolomiti', LGL: 'Luxair', AMC: 'Air Malta', ICE: 'Icelandair', BTI: 'airBaltic',
  KZR: 'Air Astana', AHY: 'Azerbaijan Airlines', UZB: 'Uzbekistan Airways', MEA: 'Middle East Airlines',
  // North America (regional / low-cost)
  HAL: 'Hawaiian Airlines', SCX: 'Sun Country', AAY: 'Allegiant', RPA: 'Republic Airways', SKW: 'SkyWest',
  ENY: 'Envoy Air', EDV: 'Endeavor Air', QXE: 'Horizon Air', JIA: 'PSA Airlines', ASH: 'Mesa Airlines',
  TSC: 'Air Transat', POE: 'Porter Airlines', JZA: 'Jazz', FLE: 'Flair Airlines', SWG: 'Sunwing',
  MXY: 'Breeze Airways', VXP: 'Avelo Airlines', VIV: 'VivaAerobus', SLI: 'Aeroméxico Connect',
  // Latin America
  ARG: 'Aerolíneas Argentinas', SKU: 'Sky Airline', LPE: 'LATAM Peru', LCO: 'LATAM Cargo',
  // Middle East / Africa
  IRA: 'Iran Air', IRM: 'Mahan Air', IAW: 'Iraqi Airways', RWD: 'RwandAir', LNK: 'Airlink',
  DTA: 'TAAG Angola', TAR: 'Tunisair', AAW: 'Afriqiyah Airways', LAA: 'Libyan Airlines',
  // East / South / SE Asia
  CQH: 'Spring Airlines', DKH: 'Juneyao Air', CSC: 'Sichuan Airlines', CDG: 'Shandong Airlines',
  GCR: 'Tianjin Airlines', HXA: 'China Express', CRK: 'Hong Kong Airlines', HKE: 'HK Express',
  LNI: 'Lion Air', BTK: 'Batik Air', CTV: 'Citilink', SJY: 'Sriwijaya Air', TGW: 'Scoot',
  JSA: 'Jetstar Asia', RBA: 'Royal Brunei', BBC: 'Biman Bangladesh', PIA: 'Pakistan Intl',
  ALK: 'SriLankan', RNA: 'Nepal Airlines', BKP: 'Bangkok Airways', NOK: 'Nok Air', TVJ: 'Thai Vietjet',
  AXB: 'Air India Express', MMA: 'Myanmar Airways Intl',
  // Japan / Korea
  APJ: 'Peach', JJP: 'Jetstar Japan', SKY: 'Skymark', ADO: 'AIRDO', SNJ: 'Solaseed Air',
  JNA: 'Jin Air', ABL: 'Air Busan', ASV: 'Air Seoul', TWB: 'Tway Air', ESR: 'Eastar Jet', JJA: 'Jeju Air',
  // Oceania
  QLK: 'QantasLink', FJI: 'Fiji Airways', ANG: 'Air Niugini',
  // Cargo
  CKS: 'Kalitta Air', CKK: 'China Cargo', AHK: 'Air Hong Kong', NCA: 'Nippon Cargo Airlines',
  MPH: 'Martinair', DHX: 'DHL Air UK', BCS: 'European Air Transport (DHL)', SQC: 'Singapore Airlines Cargo',
};

/** Look up the airline name for a callsign (uses its first 3 letters). */
export function airlineFromCallsign(callsign: string | null | undefined): string | null {
  if (!callsign) return null;
  const code = callsign.trim().slice(0, 3).toUpperCase();
  return AIRLINES[code] ?? null;
}
