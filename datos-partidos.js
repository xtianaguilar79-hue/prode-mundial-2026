// ═══════════════════════════════════════════════════════
//  PRODE MUNDIAL 2026 - FIXTURE OFICIAL FIFA
// Horarios en HORA ARGENTINA (UTC-3)
// Bloqueo: 5 minutos antes del kickoff
// Usa hora del SERVIDOR (no la del dispositivo)
// ═══════════════════════════════════════════════════════

// ─── BANDERAS DE LAS 48 SELECCIONES (VERIFICADAS Y CORRECTAS) ───
export const FLAGS = {
  // GRUPO A
  "México":               "🇲🇽",
  "Sudáfrica":            "🇿🇦",
  "Corea del Sur":        "🇰🇷",
  "Rep. Checa": "🇨🇿",
 
  // GRUPO B
  "Canadá":               "🇨🇦",
  "Bosnia-Herzegovina":   "🇧🇦",
  "Qatar":                "🇶🇦",
  "Suiza":                "🇨🇭",
 
  // GRUPO C
  "Brasil":               "🇧🇷",
  "Marruecos":            "🇲🇦",
  "Haití":                "🇭🇹",
  "Escocia":              "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
 
  // GRUPO D
  "Estados Unidos":       "🇺🇸",
  "Paraguay":             "🇵🇾",
  "Australia":            "🇦🇺",
  "Turquía":              "🇹🇷",
 
  // GRUPO E
  "Alemania":             "🇩🇪",
  "Curazao":              "🇨🇼",
  "Costa de Marfil":      "🇨🇮",
  "Ecuador":              "🇪🇨",
 
  // GRUPO F
  "Países Bajos":         "🇳🇱",
  "Japón":                "🇯🇵",
  "Suecia":               "🇸🇪",
  "Túnez":                "🇹🇳",
 
  // GRUPO G
  "Bélgica":              "🇧🇪",
  "Egipto":               "🇪🇬",
  "Irán":                 "🇮🇷",
  "Nueva Zelanda":        "🇳🇿",
  
  // GRUPO H
  "España":               "🇪🇸",
  "Cabo Verde":           "🇨🇻",
  "Arabia Saudita":       "🇸🇦",
  "Uruguay":              "🇺🇾",
 
  // GRUPO I
  "Francia":              "🇫🇷",
  "Senegal":              "🇸🇳",
  "Irak":                 "🇮🇶",
  "Noruega":              "🇳🇴",
 
  // GRUPO J
  "Argentina":            "🇦🇷",
  "Argelia":              "🇩🇿",
  "Austria":              "🇦🇹",
  "Jordania":             "🇯🇴",
 
  // GRUPO K
  "Portugal":             "🇵🇹",
  "RD Congo":             "🇨🇩",
  "Uzbekistán":           "🇺🇿",
  "Colombia":             "🇨🇴",
 
  // GRUPO L
  "Inglaterra":           "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Croacia":              "🇭🇷",
  "Ghana":                "🇬🇭",
  "Panamá":               "🇵🇦",
};

export const SELECCIONES = Object.keys(FLAGS);

export function getFlag(equipo) {
  return FLAGS[equipo] || "🏳️";
}

// ─── PARTIDOS FASE DE GRUPOS (72 partidos) ───
export const PARTIDOS_GRUPOS = [
  { id:"M001", j:1, grupo:"A", local:"México", visit:"Sudáfrica", fecha:"11/06", hora:"16:00", sede:"Azteca, CDMX" },
  { id:"M002", j:1, grupo:"A", local:"Corea del Sur", visit:"Rep. Checa", fecha:"11/06", hora:"23:00", sede:"Akron, GDL" },
  { id:"M003", j:1, grupo:"B", local:"Canadá", visit:"Bosnia-Herzegovina", fecha:"12/06", hora:"16:00", sede:"Toronto, CAN" },
  { id:"M004", j:1, grupo:"D", local:"Estados Unidos", visit:"Paraguay", fecha:"12/06", hora:"22:00", sede:"SoFi Stadium, LA" },
  { id:"M008", j:1, grupo:"B", local:"Qatar", visit:"Suiza", fecha:"13/06", hora:"16:00", sede:"San Francisco, USA" },
  { id:"M007", j:1, grupo:"C", local:"Brasil", visit:"Marruecos", fecha:"13/06", hora:"19:00", sede:"MetLife, NJ" },
  { id:"M005", j:1, grupo:"C", local:"Haití", visit:"Escocia", fecha:"13/06", hora:"22:00", sede:"Boston, USA" },
  { id:"M006", j:1, grupo:"D", local:"Australia", visit:"Turquía", fecha:"14/06", hora:"01:00", sede:"Vancouver, CAN" },
  { id:"M010", j:1, grupo:"E", local:"Alemania", visit:"Curazao", fecha:"14/06", hora:"14:00", sede:"Houston, USA" },
  { id:"M009", j:1, grupo:"E", local:"Costa de Marfil", visit:"Ecuador", fecha:"14/06", hora:"20:00", sede:"Filadelfia, USA" },
  { id:"M011", j:1, grupo:"F", local:"Países Bajos", visit:"Japón", fecha:"14/06", hora:"17:00", sede:"Dallas, USA" },  { id:"M012", j:1, grupo:"F", local:"Suecia", visit:"Túnez", fecha:"14/06", hora:"23:00", sede:"BBVA, MTY" },
  { id:"M014", j:1, grupo:"H", local:"España", visit:"Cabo Verde", fecha:"15/06", hora:"13:00", sede:"Atlanta, USA" },
  { id:"M016", j:1, grupo:"G", local:"Bélgica", visit:"Egipto", fecha:"15/06", hora:"16:00", sede:"Seattle, USA" },
  { id:"M013", j:1, grupo:"H", local:"Arabia Saudita", visit:"Uruguay", fecha:"15/06", hora:"19:00", sede:"Miami, USA" },
  { id:"M015", j:1, grupo:"G", local:"Irán", visit:"Nueva Zelanda", fecha:"15/06", hora:"22:00", sede:"Los Angeles, USA" },
  { id:"M017", j:1, grupo:"I", local:"Francia", visit:"Senegal", fecha:"16/06", hora:"16:00", sede:"Nueva York/NJ, USA" },
  { id:"M018", j:1, grupo:"I", local:"Irak", visit:"Noruega", fecha:"16/06", hora:"19:00", sede:"Boston, USA" },
  { id:"M019", j:1, grupo:"J", local:"Argentina", visit:"Argelia", fecha:"16/06", hora:"22:00", sede:"Kansas City, USA" },
  { id:"M020", j:1, grupo:"J", local:"Austria", visit:"Jordania", fecha:"17/06", hora:"01:00", sede:"San Francisco, USA" },
  { id:"M023", j:1, grupo:"K", local:"Portugal", visit:"RD Congo", fecha:"17/06", hora:"14:00", sede:"Houston, USA" },
  { id:"M022", j:1, grupo:"L", local:"Inglaterra", visit:"Croacia", fecha:"17/06", hora:"17:00", sede:"Dallas, USA" },
  { id:"M021", j:1, grupo:"L", local:"Ghana", visit:"Panamá", fecha:"17/06", hora:"20:00", sede:"Toronto, CAN" },
  { id:"M024", j:1, grupo:"K", local:"Uzbekistán", visit:"Colombia", fecha:"17/06", hora:"23:00", sede:"Azteca, CDMX" },
  { id:"M025", j:2, grupo:"A", local:"Rep. Checa", visit:"Sudáfrica", fecha:"18/06", hora:"13:00", sede:"Atlanta, USA" },
  { id:"M026", j:2, grupo:"B", local:"Suiza", visit:"Bosnia-Herzegovina", fecha:"18/06", hora:"16:00", sede:"Los Angeles, USA" },
  { id:"M027", j:2, grupo:"B", local:"Canadá", visit:"Qatar", fecha:"18/06", hora:"19:00", sede:"Vancouver, CAN" },
  { id:"M028", j:2, grupo:"A", local:"México", visit:"Corea del Sur", fecha:"18/06", hora:"22:00", sede:"Akron, GDL" },
  { id:"M029", j:2, grupo:"C", local:"Brasil", visit:"Haití", fecha:"19/06", hora:"21:30", sede:"Filadelfia, USA" },
  { id:"M030", j:2, grupo:"C", local:"Escocia", visit:"Marruecos", fecha:"19/06", hora:"19:00", sede:"Boston, USA" },
  { id:"M032", j:2, grupo:"D", local:"Estados Unidos", visit:"Australia", fecha:"19/06", hora:"16:00", sede:"Seattle, USA" },
  { id:"M031", j:2, grupo:"D", local:"Turquía", visit:"Paraguay", fecha:"20/06", hora:"00:00", sede:"San Francisco, USA" },
  { id:"M033", j:2, grupo:"E", local:"Alemania", visit:"Costa de Marfil", fecha:"20/06", hora:"17:00", sede:"Toronto, CAN" },
  { id:"M035", j:2, grupo:"F", local:"Países Bajos", visit:"Suecia", fecha:"20/06", hora:"14:00", sede:"Houston, USA" },
  { id:"M034", j:2, grupo:"E", local:"Ecuador", visit:"Curazao", fecha:"20/06", hora:"21:00", sede:"Kansas City, USA" },
  { id:"M036", j:2, grupo:"F", local:"Túnez", visit:"Japón", fecha:"21/06", hora:"01:00", sede:"BBVA, MTY" },
  { id:"M038", j:2, grupo:"H", local:"España", visit:"Arabia Saudita", fecha:"21/06", hora:"13:00", sede:"Atlanta, USA" },
  { id:"M039", j:2, grupo:"G", local:"Bélgica", visit:"Irán", fecha:"21/06", hora:"16:00", sede:"Los Angeles, USA" },
  { id:"M037", j:2, grupo:"H", local:"Uruguay", visit:"Cabo Verde", fecha:"21/06", hora:"19:00", sede:"Miami, USA" },
  { id:"M040", j:2, grupo:"G", local:"Nueva Zelanda", visit:"Egipto", fecha:"21/06", hora:"22:00", sede:"Vancouver, CAN" },
  { id:"M042", j:2, grupo:"I", local:"Francia", visit:"Irak", fecha:"22/06", hora:"18:00", sede:"Filadelfia, USA" },
  { id:"M043", j:2, grupo:"J", local:"Argentina", visit:"Austria", fecha:"22/06", hora:"14:00", sede:"Dallas, USA" },
  { id:"M041", j:2, grupo:"I", local:"Noruega", visit:"Senegal", fecha:"22/06", hora:"21:00", sede:"Nueva York/NJ, USA" },
  { id:"M044", j:2, grupo:"J", local:"Jordania", visit:"Argelia", fecha:"23/06", hora:"00:00", sede:"San Francisco, USA" },
  { id:"M047", j:2, grupo:"K", local:"Portugal", visit:"Uzbekistán", fecha:"23/06", hora:"14:00", sede:"Houston, USA" },
  { id:"M045", j:2, grupo:"L", local:"Inglaterra", visit:"Ghana", fecha:"23/06", hora:"17:00", sede:"Boston, USA" },
  { id:"M046", j:2, grupo:"L", local:"Panamá", visit:"Croacia", fecha:"23/06", hora:"20:00", sede:"Toronto, CAN" },
  { id:"M048", j:2, grupo:"K", local:"Colombia", visit:"RD Congo", fecha:"23/06", hora:"23:00", sede:"Akron, GDL" },
  { id:"M051", j:3, grupo:"B", local:"Suiza", visit:"Canadá", fecha:"24/06", hora:"16:00", sede:"Vancouver, CAN" },
  { id:"M052", j:3, grupo:"B", local:"Bosnia-Herzegovina", visit:"Qatar", fecha:"24/06", hora:"16:00", sede:"Seattle, USA" },
  { id:"M049", j:3, grupo:"C", local:"Escocia", visit:"Brasil", fecha:"24/06", hora:"19:00", sede:"Miami, USA" },
  { id:"M050", j:3, grupo:"C", local:"Marruecos", visit:"Haití", fecha:"24/06", hora:"19:00", sede:"Atlanta, USA" },
  { id:"M053", j:3, grupo:"A", local:"Rep. Checa", visit:"México", fecha:"24/06", hora:"22:00", sede:"Azteca, CDMX" },
  { id:"M054", j:3, grupo:"A", local:"Sudáfrica", visit:"Corea del Sur", fecha:"24/06", hora:"22:00", sede:"BBVA, MTY" },
  { id:"M055", j:3, grupo:"E", local:"Curazao", visit:"Costa de Marfil", fecha:"25/06", hora:"17:00", sede:"Filadelfia, USA" },
  { id:"M056", j:3, grupo:"E", local:"Ecuador", visit:"Alemania", fecha:"25/06", hora:"17:00", sede:"Nueva York/NJ, USA" },
  { id:"M057", j:3, grupo:"F", local:"Japón", visit:"Suecia", fecha:"25/06", hora:"20:00", sede:"Dallas, USA" },
  { id:"M058", j:3, grupo:"F", local:"Túnez", visit:"Países Bajos", fecha:"25/06", hora:"20:00", sede:"Kansas City, USA" },
  { id:"M059", j:3, grupo:"D", local:"Turquía", visit:"Estados Unidos", fecha:"25/06", hora:"23:00", sede:"Los Angeles, USA" },
  { id:"M060", j:3, grupo:"D", local:"Paraguay", visit:"Australia", fecha:"25/06", hora:"23:00", sede:"San Francisco, USA" },
  { id:"M061", j:3, grupo:"I", local:"Noruega", visit:"Francia", fecha:"26/06", hora:"16:00", sede:"Boston, USA" },  { id:"M062", j:3, grupo:"I", local:"Senegal", visit:"Irak", fecha:"26/06", hora:"16:00", sede:"Toronto, CAN" },
  { id:"M065", j:3, grupo:"H", local:"Cabo Verde", visit:"Arabia Saudita", fecha:"26/06", hora:"21:00", sede:"Houston, USA" },
  { id:"M066", j:3, grupo:"H", local:"Uruguay", visit:"España", fecha:"26/06", hora:"21:00", sede:"Akron, GDL" },
  { id:"M063", j:3, grupo:"G", local:"Egipto", visit:"Irán", fecha:"27/06", hora:"00:00", sede:"Seattle, USA" },
  { id:"M064", j:3, grupo:"G", local:"Nueva Zelanda", visit:"Bélgica", fecha:"27/06", hora:"00:00", sede:"Vancouver, CAN" },
  { id:"M067", j:3, grupo:"L", local:"Panamá", visit:"Inglaterra", fecha:"27/06", hora:"18:00", sede:"Nueva York/NJ, USA" },
  { id:"M068", j:3, grupo:"L", local:"Croacia", visit:"Ghana", fecha:"27/06", hora:"18:00", sede:"Filadelfia, USA" },
  { id:"M071", j:3, grupo:"K", local:"Colombia", visit:"Portugal", fecha:"27/06", hora:"20:30", sede:"Miami, USA" },
  { id:"M072", j:3, grupo:"K", local:"RD Congo", visit:"Uzbekistán", fecha:"27/06", hora:"20:30", sede:"Atlanta, USA" },
  { id:"M069", j:3, grupo:"J", local:"Argelia", visit:"Austria", fecha:"27/06", hora:"23:00", sede:"Kansas City, USA" },
  { id:"M070", j:3, grupo:"J", local:"Jordania", visit:"Argentina", fecha:"27/06", hora:"23:00", sede:"Dallas, USA" },
];

// ─── PARTIDOS ELIMINATORIOS (32 partidos) ───
export const PARTIDOS_ELIM = [
  { id:"M073", fase:"16avos", local:"2°A", visit:"2°B", fecha:"28/06", hora:"16:00", sede:"Los Angeles, USA" },
  { id:"M076", fase:"16avos", local:"1°C", visit:"2°F", fecha:"29/06", hora:"14:00", sede:"Houston, USA" },
  { id:"M074", fase:"16avos", local:"1°E", visit:"3° A/B/C/D/F", fecha:"29/06", hora:"17:30", sede:"Boston, USA" },
  { id:"M075", fase:"16avos", local:"1°F", visit:"2°C", fecha:"29/06", hora:"22:00", sede:"BBVA, MTY" },
  { id:"M078", fase:"16avos", local:"2°E", visit:"2°I", fecha:"30/06", hora:"14:00", sede:"Dallas, USA" },
  { id:"M077", fase:"16avos", local:"1°I", visit:"3° C/D/F/G/H", fecha:"30/06", hora:"18:00", sede:"Nueva York/NJ, USA" },
  { id:"M079", fase:"16avos", local:"1°A", visit:"3° C/E/F/H/I", fecha:"30/06", hora:"22:00", sede:"Azteca, CDMX" },
  { id:"M080", fase:"16avos", local:"1°L", visit:"3° E/H/I/J/K", fecha:"01/07", hora:"13:00", sede:"Atlanta, USA" },
  { id:"M082", fase:"16avos", local:"1°G", visit:"3° A/E/H/I/J", fecha:"01/07", hora:"17:00", sede:"Seattle, USA" },
  { id:"M081", fase:"16avos", local:"1°D", visit:"3° B/E/F/I/J", fecha:"01/07", hora:"21:00", sede:"San Francisco, USA" },
  { id:"M084", fase:"16avos", local:"1°H", visit:"2°J", fecha:"02/07", hora:"16:00", sede:"Los Angeles, USA" },
  { id:"M083", fase:"16avos", local:"2°K", visit:"2°L", fecha:"02/07", hora:"20:00", sede:"Toronto, CAN" },
  { id:"M085", fase:"16avos", local:"1°B", visit:"3° E/F/G/I/J", fecha:"03/07", hora:"00:00", sede:"Vancouver, CAN" },
  { id:"M088", fase:"16avos", local:"2°D", visit:"2°G", fecha:"03/07", hora:"15:00", sede:"Dallas, USA" },
  { id:"M086", fase:"16avos", local:"1°J", visit:"2°H", fecha:"03/07", hora:"19:00", sede:"Miami, USA" },
  { id:"M087", fase:"16avos", local:"1°K", visit:"3° D/E/I/J/L", fecha:"03/07", hora:"22:30", sede:"Kansas City, USA" },
  { id:"M090", fase:"octavos", local:"G73", visit:"G75", fecha:"04/07", hora:"14:00", sede:"Houston, USA" },
  { id:"M089", fase:"octavos", local:"G74", visit:"G77", fecha:"04/07", hora:"18:00", sede:"Filadelfia, USA" },
  { id:"M091", fase:"octavos", local:"G76", visit:"G78", fecha:"05/07", hora:"17:00", sede:"Nueva York/NJ, USA" },
  { id:"M092", fase:"octavos", local:"G79", visit:"G80", fecha:"05/07", hora:"21:00", sede:"Azteca, CDMX" },
  { id:"M093", fase:"octavos", local:"G83", visit:"G84", fecha:"06/07", hora:"16:00", sede:"Dallas, USA" },
  { id:"M094", fase:"octavos", local:"G81", visit:"G82", fecha:"06/07", hora:"21:00", sede:"Seattle, USA" },
  { id:"M095", fase:"octavos", local:"G86", visit:"G88", fecha:"07/07", hora:"13:00", sede:"Atlanta, USA" },
  { id:"M096", fase:"octavos", local:"G85", visit:"G87", fecha:"07/07", hora:"17:00", sede:"Vancouver, CAN" },
  { id:"M097", fase:"cuartos", local:"G89", visit:"G90", fecha:"09/07", hora:"17:00", sede:"Boston, USA" },
  { id:"M098", fase:"cuartos", local:"G93", visit:"G94", fecha:"10/07", hora:"16:00", sede:"Los Angeles, USA" },
  { id:"M099", fase:"cuartos", local:"G91", visit:"G92", fecha:"11/07", hora:"18:00", sede:"Miami, USA" },
  { id:"M100", fase:"cuartos", local:"G95", visit:"G96", fecha:"11/07", hora:"22:00", sede:"Kansas City, USA" },
  { id:"M101", fase:"semis", local:"G97", visit:"G98", fecha:"14/07", hora:"16:00", sede:"Dallas, USA" },
  { id:"M102", fase:"semis", local:"G99", visit:"G100", fecha:"15/07", hora:"16:00", sede:"Atlanta, USA" },
  { id:"M103", fase:"3er", local:"Perdedor SF1", visit:"Perdedor SF2", fecha:"18/07", hora:"18:00", sede:"Miami, USA" },
  { id:"M104", fase:"final", local:"Ganador SF1", visit:"Ganador SF2", fecha:"19/07", hora:"16:00", sede:"MetLife, NJ" },
];

export const TODOS_PARTIDOS = [...PARTIDOS_GRUPOS, ...PARTIDOS_ELIM];
// ─── SISTEMA DE PUNTOS UNIFICADO ───
export const PUNTOS = {
  grupos:    { signo: 3,  golL: 3,  golV: 3,  exacto: 5,  alargue: 0,  penales: 0  },
  "16avos":  { signo: 3,  golL: 3,  golV: 3,  exacto: 5,  alargue: 3,  penales: 3  },
  octavos:   { signo: 3,  golL: 3,  golV: 3,  exacto: 5,  alargue: 3,  penales: 3  },
  cuartos:   { signo: 3,  golL: 3,  golV: 3,  exacto: 5,  alargue: 3,  penales: 3  },
  semis:     { signo: 3,  golL: 3,  golV: 3,  exacto: 5,  alargue: 3,  penales: 3  },
  "3er":     { signo: 3,  golL: 3,  golV: 3,  exacto: 5,  alargue: 3,  penales: 3  },
  final:     { signo: 3,  golL: 3,  golV: 3,  exacto: 5,  alargue: 3,  penales: 3  },
};

// ── CÁLCULO DE PUNTOS ───
export function calcularPuntos(pred, resultado) {
  if (!resultado || resultado.local === undefined || pred.local === undefined) return 0;
  
  const pL = parseInt(pred.local), pV = parseInt(pred.visit);
  const rL = parseInt(resultado.local), rV = parseInt(resultado.visit);
  if (isNaN(pL) || isNaN(pV) || isNaN(rL) || isNaN(rV)) return 0;

  const fase = pred.fase || "grupos";
  const pts = PUNTOS[fase];
  let total = 0;

  const signoR = rL > rV ? "L" : rL < rV ? "V" : "E";
  const signoP = pL > pV ? "L" : pL < pV ? "V" : "E";
  if (signoP === signoR) total += pts.signo;

  if (pL === rL) total += pts.golL;
  if (pV === rV) total += pts.golV;

  if (pL === rL && pV === rV) total += pts.exacto;

  if (fase !== "grupos" && signoP === "E" && signoR === "E") {
    const pAL = pred.alargue_local !== null && pred.alargue_local !== undefined ? parseInt(pred.alargue_local) : null;
    const pAV = pred.alargue_visit !== null && pred.alargue_visit !== undefined ? parseInt(pred.alargue_visit) : null;
    const rAL = resultado.alargue_local !== null && resultado.alargue_local !== undefined ? parseInt(resultado.alargue_local) : null;
    const rAV = resultado.alargue_visit !== null && resultado.alargue_visit !== undefined ? parseInt(resultado.alargue_visit) : null;

    if (pAL !== null && pAV !== null && rAL !== null && rAV !== null) {
      const signoAlR = rAL > rAV ? "L" : rAL < rAV ? "V" : "E";
      const signoAlP = pAL > pAV ? "L" : pAL < pAV ? "V" : "E";
      
      if (signoAlP === signoAlR) total += pts.alargue;
      if (pAL === rAL) total += pts.golL;
      if (pAV === rAV) total += pts.golV;
      
      if (pAL === rAL && pAV === rAV) {
        total += pts.exacto;
                if (signoAlR === "E") {
          const pPL = pred.penales_local !== null && pred.penales_local !== undefined ? parseInt(pred.penales_local) : null;
          const pPV = pred.penales_visit !== null && pred.penales_visit !== undefined ? parseInt(pred.penales_visit) : null;
          const rPL = resultado.penales_local !== null && resultado.penales_local !== undefined ? parseInt(resultado.penales_local) : null;
          const rPV = resultado.penales_visit !== null && resultado.penales_visit !== undefined ? parseInt(resultado.penales_visit) : null;

          if (pPL !== null && pPV !== null && rPL !== null && rPV !== null) {
            const ganadorPenR = rPL > rPV ? "L" : "V";
            const ganadorPenP = pPL > pPV ? "L" : "V";
            
            if (ganadorPenP === ganadorPenR) total += pts.penales;
            if (pPL === rPL) total += pts.golL;
            if (pPV === rPV) total += pts.golV;
            if (pPL === rPL && pPV === rPV) total += pts.exacto;
          }
        }
      }
    }
  }

  return total;
}

// ── PRONÓSTICO DEL CAMPEÓN ──
export const PUNTOS_CAMPEON_POR_FASE = {
  "pre-inicio":  [100, 80, 60],
  "pre-fecha2":  [90, 70, 50],
  "pre-fecha3":  [80, 60, 40],
  "pre-16avos":  [70, 50, 30],
  "pre-octavos": [50, 30, 10],
  "pre-cuartos": [40, 20, 0],
  "pre-semis":   [30, 10, 0],
  "pre-final":   [10, 0, 0],
  "cerrado":     [0, 0, 0],
};

export const FECHAS_LIMITE_CAMPEON = {
  "pre-inicio":  "2026-06-11T15:55:00-03:00",
  "pre-fecha2":  "2026-06-18T12:55:00-03:00",
  "pre-fecha3":  "2026-06-24T15:55:00-03:00",
  "pre-16avos":  "2026-06-28T15:55:00-03:00",
  "pre-octavos": "2026-07-04T13:55:00-03:00",
  "pre-cuartos": "2026-07-09T16:55:00-03:00",
  "pre-semis":   "2026-07-14T15:55:00-03:00",
  "pre-final":   "2026-07-19T15:55:00-03:00",
};

// ═══════════════════════════════════════════════════════
// SINCRONIZACIÓN DE HORA CON SERVIDOR (RPC SUPABASE)
// ═══════════════════════════════════════════════════════

let timestampServidor = null;
let timestampLocalSync = null;
let horaSincronizada = false;

export async function sincronizarHoraServidor(supabaseClient) {
  console.log("🕐 ═══ INICIANDO SINCRONIZACIÓN DE HORA ═══");
  console.log("🗄️ Usando función RPC de Supabase...");
  
  try {
    const horaAntes = Date.now();
    
    const { data, error } = await supabaseClient.rpc('obtener_hora_servidor');
    
    const horaDespues = Date.now();
    
    if (error) {
      console.error("❌ Error en RPC:", error.message);
      console.error("⚠️ Asegurate de haber creado la función en Supabase SQL Editor");
      horaSincronizada = true;
      return;
    }
    
    if (data) {
      timestampServidor = new Date(data).getTime();
      timestampLocalSync = (horaAntes + horaDespues) / 2;
      horaSincronizada = true;
      
      const diferencia = timestampServidor - timestampLocalSync;
      
      console.log("✅ SINCRONIZACIÓN EXITOSA vía Supabase RPC");
      console.log(`   Hora del servidor (UTC): ${data}`);
      console.log(`   Timestamp servidor: ${timestampServidor}`);
      console.log(`   Timestamp local: ${timestampLocalSync}`);
      console.log(`   Diferencia inicial: ${diferencia}ms (${(diferencia/1000).toFixed(2)}s)`);
      
      if (Math.abs(diferencia) > 30000) {
        const minutos = Math.round(diferencia / 60000);
        console.warn(`⚠️ Tu dispositivo está ${minutos > 0 ? 'ADELANTADO' : 'ATRASADO'} ${Math.abs(minutos)} minuto(s)`);
      } else {
        console.log("✅ La hora de tu dispositivo es correcta");
      }
    } else {
      console.error("❌ RPC no devolvió datos");
      horaSincronizada = true;
    }
  } catch (err) {
    console.error("❌ Error al sincronizar hora:", err.message);
    horaSincronizada = true;
  }
}

export function horaReal() {
  // Si no está sincronizado, usar hora local
  if (!horaSincronizada || timestampServidor === null) {
    return Date.now();
  }
  
  // Calcular cuánto tiempo pasó desde la sincronización
  const tiempoTranscurrido = Date.now() - timestampLocalSync;
  
  // La hora real es el timestamp del servidor + el tiempo transcurrido
  return timestampServidor + tiempoTranscurrido;
}

export function esHoraSincronizada() {
  return horaSincronizada;
}

export function obtenerDiferenciaHoraria() {
  if (!horaSincronizada || timestampServidor === null) return 0;
  return timestampServidor - Date.now();
}


export function obtenerFaseActual() {
  const ahora = new Date(horaReal());
  for (const [fase, fechaLimite] of Object.entries(FECHAS_LIMITE_CAMPEON)) {
    if (ahora < new Date(fechaLimite)) return fase;
  }
  return "cerrado";
}

export function obtenerPuntosCampeonDisponibles() {
  const fase = obtenerFaseActual();
  return { 
    fase, 
    puntos: PUNTOS_CAMPEON_POR_FASE[fase], 
    cerrado: fase === "cerrado" 
  };
}

export function calcularPuntosCampeon(prediccion, campeonReal) {
  if (!prediccion || !campeonReal || !prediccion.bloqueado || !prediccion.puntos_otorgados) return 0;
  const pts = prediccion.puntos_otorgados;
  if (campeonReal === prediccion.opcion1) return pts[0];
  if (campeonReal === prediccion.opcion2) return pts[1];  if (campeonReal === prediccion.opcion3) return pts[2];
  return 0;
}

// ── CRONÓMETRO Y BLOQUEO ───
export function getKickoffTimestamp(partido) {
  const [dia, mes] = partido.fecha.split("/");
  const [hora, min] = partido.hora.split(":");
  return new Date(`2026-${mes}-${dia}T${hora}:${min}:00-03:00`).getTime();
}

export function msHastaBloqueo(partido) {
  return (getKickoffTimestamp(partido) - (5 * 60 * 1000)) - horaReal();
}

export function formatearTiempo(ms) {
  if (ms <= 0) return "BLOQUEADO";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const pad = n => n.toString().padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(seg)}`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(seg)}`;
  return `${pad(m)}:${pad(seg)}`;
}

export function partidoBloqueado(partido) {
  return msHastaBloqueo(partido) <= 0;
}

export function partidoListoParaPronosticar(partido, equiposActualizados) {
  if (partido.j) return true;
  
  const actualizado = equiposActualizados[partido.id];
  if (!actualizado) return false;
  
  const local = actualizado.local || partido.local;
  const visit = actualizado.visit || partido.visit;
  
  const esPlaceholder = (equipo) => {
    return /°|G\d+|Ganador|Perdedor|Camp\.|3er|mejor/.test(equipo);
  };
  
  return !esPlaceholder(local) && !esPlaceholder(visit);
  }