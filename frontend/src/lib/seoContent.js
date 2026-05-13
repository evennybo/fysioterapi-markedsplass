// src/lib/seoContent.js
// Genererer dynamisk SEO-innhold for områder og spesialiteter

// ── Kjente steder med ekstra innhold ─────────────────────────────────────────
const STED_INNHOLD = {
  oslo: {
    intro: 'Oslo er Norges største by med over 700 000 innbyggere og et bredt tilbud av fysioterapeuter i alle bydeler. Fra Majorstuen og Frogner i vest til Grünerløkka og Østensjø i øst finner du klinikker tilpasset alle behov.',
    bydeler: ['Majorstuen', 'Frogner', 'Grünerløkka', 'St. Hanshaugen', 'Sagene', 'Østensjø', 'Nordstrand', 'Bjerke', 'Grorud', 'Stovner', 'Alna', 'Søndre Nordstrand', 'Ullern', 'Vestre Aker', 'Nordre Aker'],
    fakta: 'Oslo har en av landets høyeste tettheter av helsepersonell. Mange klinikker har spesialisert seg på idrettsskader, noe som henger sammen med byens aktive befolkning og nærheten til fjellet og marka.',
  },
  bergen: {
    intro: 'Bergen er Norges nest største by og regionhovedstad for Vestland. Fysioterapitilbudet er godt utbygd, med mange klinikker sentralt og i bydelene rundt Bergensdalen.',
    fakta: 'Bergen har en aktiv idrettskultur og mange klinikker med kompetanse på skulder- og kneskader.',
  },
  trondheim: {
    intro: 'Trondheim er Norges tredje største by og universitetsby. Med NTNU og tett samarbeid mellom forskning og klinikk finner du her mange spesialiserte fysioterapeuter med oppdatert kompetanse.',
    fakta: 'Trondheim har sterke fagmiljøer innen manuellterapi og nevrologisk rehabilitering, drevet frem av universitetsmiljøet.',
  },
  stavanger: {
    intro: 'Stavanger er Norges olje- og energihovedstad og en av Norges raskest voksende byer. Fysioterapitilbudet er godt, med spesiell kompetanse på arbeidsrelaterte skader og ergonomi.',
    fakta: 'Mange klinikker i Stavanger har erfaring med oljearbeidere og ergonomiske utfordringer i industrielle yrker.',
  },
}

const SPESIALITET_INNHOLD = {
  'idrettsskader': {
    hva: 'Idrettsfysioterapi handler om å forebygge, diagnostisere og behandle skader og sykdommer knyttet til sport og fysisk aktivitet. En idrettsfysioterapeut hjelper deg tilbake til full aktivitet etter skade.',
    nar: 'Oppsøk idrettsfysioterapeut ved forstuing, muskeltårer, seneproblemer, kneskader (korsbånd, menisk), skulderproblemer eller overbelastningsskader fra trening.',
    behandling: ['Undersøkelse og diagnostikk', 'Treningsveiledning og rehabilitering', 'Taping og støttebandasjering', 'Manuell behandling', 'Forebyggende trening'],
    kilde: { tekst: 'Norsk Idrettsmedisinsk Forening', url: 'https://www.nimf.no' },
  },
  'rygg og nakke': {
    hva: 'Rygg- og nakkesmerter er en av de vanligste årsakene til sykefravær i Norge. En fysioterapeut kan hjelpe med å identifisere årsak, redusere smerter og gi deg verktøy til å forebygge nye plager.',
    nar: 'Oppsøk fysioterapeut ved vedvarende rygg- eller nakkesmerter, smerter som stråler ut i armer eller ben, stivhet etter oppvåkning eller etter skade.',
    behandling: ['Manuell terapi og mobilisering', 'Spesifikke øvelser og styrketrening', 'Ergonomiråd og arbeidsplasstilpasning', 'Holdningstrening', 'Smertelindring'],
    kilde: { tekst: 'Folkehelseinstituttet om ryggsmerter', url: 'https://www.fhi.no/nettpub/hin/ikke-smittsomme/muskel-og-skjeletthelse/' },
  },
  'barn og unge': {
    hva: 'Barnefysioterapi handler om å støtte barns motoriske utvikling, behandle medfødte tilstander og hjelpe barn som har opplevd skader eller sykdom.',
    nar: 'Aktuelt for barn med forsinket motorisk utvikling, cerebral parese, hypermobilitet, idrettsskader, skoliose eller andre muskel- og skjelettplager.',
    behandling: ['Lekbasert trening og øvelser', 'Motorisk veiledning', 'Foreldreopplæring', 'Hjelpemiddelutprøving', 'Samarbeid med barnehage og skole'],
    kilde: { tekst: 'NFF om barnefysioterapi', url: 'https://www.fysio.no/Hva-er-fysioterapi/Fagomrader/Barn-og-unge' },
  },
  'manuellterapi': {
    hva: 'Manuellterapi er en videreutdanning innen fysioterapi som gir rett til å undersøke og behandle lidelser i muskel- og skjelettsystemet uten henvisning fra lege, samt sykemelde pasienter.',
    nar: 'Aktuelt for smerter i ledd, muskler og nerver – særlig i nakke, rygg, skuldre, hofte og knær.',
    behandling: ['Klinisk undersøkelse og diagnose', 'Manipulasjon og mobilisering av ledd', 'Bløtvevsbehandling', 'Spesifikke rehabiliteringsøvelser'],
    kilde: { tekst: 'Norsk Manuellterapeutforening', url: 'https://www.manuellterapeutene.org' },
  },
  'svangerskap': {
    hva: 'Svangerskapsrelaterte fysioterapi hjelper kvinner med bekkenløsning, ryggplager, symfysesmerter og andre muskel- og skjelettproblemer under og etter graviditet.',
    nar: 'Oppsøk fysioterapeut ved bekkensmerter, smerter i symfysen, tungt bekken, smerter i rygg eller hofte under graviditeten.',
    behandling: ['Stabiliserende øvelser', 'Bekkenbunnstrening', 'Råd om aktivitet og hvile', 'Manuell behandling', 'Barseltrening'],
    kilde: { tekst: 'Norsk Fysioterapeutforbund', url: 'https://www.fysio.no' },
  },
  'nevrologisk': {
    hva: 'Nevrologisk fysioterapi er spesialisert behandling for pasienter med sykdommer eller skader i nervesystemet, som hjerneslag, MS, Parkinsons sykdom eller ryggmargsskade.',
    nar: 'Aktuelt etter hjerneslag, TIA, hodeskade, ved MS, Parkinsons, ALS, nevropati eller annen nevrologisk diagnose.',
    behandling: ['Gangtrening og balanserehabilitering', 'Armfunksjon og finmotorikk', 'Spastisitetshåndtering', 'Kognitiv motorisk trening'],
    kilde: { tekst: 'Norsk Nevrologisk Forening', url: 'https://www.nevrologi.no' },
  },
}

// ── Generisk innhold for ukjente steder ──────────────────────────────────────
function lagStedInnhold(sted) {
  const stedData = STED_INNHOLD[sted.toLowerCase()]
  return {
    intro: stedData?.intro || `Finn kvalifiserte fysioterapeuter i ${sted}. Vi har samlet alle registrerte fysioterapiklinikker i ${sted}-området basert på åpne data fra Brønnøysundregistrene.`,
    bydeler: stedData?.bydeler || null,
    fakta: stedData?.fakta || null,
  }
}

function lagSpesialitetInnhold(spesialitet) {
  const key = spesialitet.toLowerCase()
  return SPESIALITET_INNHOLD[key] || {
    hva: `${spesialitet} er en spesialisering innen fysioterapi som fokuserer på å forebygge og behandle relevante plager og skader.`,
    nar: `Snakk med fastlegen din eller kontakt en klinikk direkte for å finne ut om ${spesialitet.toLowerCase()} er riktig for deg.`,
    behandling: ['Undersøkelse og kartlegging', 'Individuelt tilpasset behandling', 'Øvelser og egentrening', 'Råd og veiledning'],
    kilde: null,
  }
}

// ── Hoved-eksport ─────────────────────────────────────────────────────────────
export function genererSEOInnhold({ q, spesialitet, fylke, kommune }) {
  const sted = kommune || q || fylke
  const harSted = !!sted
  const harSpec = !!spesialitet

  // H1
  let h1 = 'Alle fysioterapeuter i Norge'
  if (harSted && harSpec) h1 = `Fysioterapeuter i ${sted} med spesialitet i ${spesialitet.toLowerCase()}`
  else if (harSted) h1 = `Fysioterapeuter i ${sted}`
  else if (harSpec) h1 = `Fysioterapeuter med spesialitet: ${spesialitet}`

  // Meta description
  let metaDesc = 'Søk blant over 6 800 norske fysioterapiklinikker. Finn rett fysioterapeut nær deg – gratis oversikt basert på åpne data fra Brønnøysundregistrene.'
  if (harSted && harSpec) metaDesc = `Finn fysioterapeuter i ${sted} som spesialiserer seg på ${spesialitet.toLowerCase()}. Komplett oversikt over klinikker med kontaktinfo og adresse.`
  else if (harSted) metaDesc = `Finn fysioterapeuter i ${sted}. Oversikt over alle registrerte fysioterapiklinikker med adresse, telefon og spesialiteter.`
  else if (harSpec) metaDesc = `Finn fysioterapeuter med spesialitet i ${spesialitet.toLowerCase()}. Søk blant over 6 800 norske klinikker registrert i Brønnøysundregistrene.`

  // Innholdsseksjoner
  const stedInnhold = harSted ? lagStedInnhold(sted) : null
  const specInnhold = harSpec ? lagSpesialitetInnhold(spesialitet) : null

  return { h1, metaDesc, stedInnhold, specInnhold, harSted, harSpec, sted, spesialitet }
}

export const GENERELL_FAQ = [
  { q: 'Trenger jeg henvisning fra lege?', a: 'Nei – du kan gå direkte til fysioterapeut uten legerevisning. Har du likevel en legeerklæring, ta den med.' },
  { q: 'Hva koster en time?', a: 'En time fysioterapi koster typisk 500–900 kr. Har du yrkesskade, grønt kort eller fri behandling kan du få redusert pris eller gratis behandling.' },
  { q: 'Hvor lang tid tar behandlingen?', a: 'En konsultasjon varer typisk 30–60 minutter. Antall behandlinger varierer fra 3–4 til 10–20, avhengig av tilstanden.' },
  { q: 'Hva skjer på første time?', a: 'Terapeuten starter med en grundig samtale om plagene dine, etterfulgt av en funksjonell undersøkelse. Dere lager deretter en behandlingsplan sammen.' },
  { q: 'Dekker forsikringen?', a: 'Mange private helseforsikringer dekker fysioterapi. Sjekk vilkårene i din forsikringsavtale.' },
]
