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
};

/** Look up the airline name for a callsign (uses its first 3 letters). */
export function airlineFromCallsign(callsign: string | null | undefined): string | null {
  if (!callsign) return null;
  const code = callsign.trim().slice(0, 3).toUpperCase();
  return AIRLINES[code] ?? null;
}
