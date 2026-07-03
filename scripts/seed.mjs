// Generates src/data/submissions.json deterministically.
// Run: node scripts/seed.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Deterministic PRNG so the demo data is stable across runs.
let seed = 20260703;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// Each template: [lang, original text, English translation, severity, themes]
const TEMPLATES = {
  education: [
    ["te", "మా ఊరిలో హైస్కూల్ లేదు, పిల్లలు రోజూ 6 కిలోమీటర్లు నడిచి వెళ్తున్నారు. దయచేసి స్కూల్ అప్‌గ్రేడ్ చేయండి.", "There is no high school in our village; children walk 6 km every day. Please upgrade the school.", 4, ["school distance", "high school upgrade"]],
    ["te", "ప్రభుత్వ పాఠశాలలో తరగతి గదులు సరిపోవడం లేదు, ఒక్క గదిలో రెండు తరగతులు నడుస్తున్నాయి.", "Classrooms in the government school are insufficient; two classes run in one room.", 3, ["classroom shortage"]],
    ["hi", "हमारे स्कूल में विज्ञान की प्रयोगशाला नहीं है। बच्चों को प्रैक्टिकल के लिए शहर जाना पड़ता है।", "Our school has no science lab. Children must travel to town for practicals.", 3, ["science lab", "school infrastructure"]],
    ["en", "Girls are dropping out after 7th class because the nearest high school is too far and there is no bus.", "Girls are dropping out after 7th class because the nearest high school is too far and there is no bus.", 5, ["girls dropout", "school distance", "transport"]],
    ["te", "స్కూల్‌లో టాయిలెట్లు పాడైపోయాయి, ఆడపిల్లలు చాలా ఇబ్బంది పడుతున్నారు.", "School toilets are broken; girl students face great difficulty.", 4, ["school toilets", "girls"]],
    ["ta", "எங்கள் பள்ளியில் ஆசிரியர்கள் பற்றாக்குறை உள்ளது. இரண்டு வகுப்புகளுக்கு ஒரே ஆசிரியர்.", "Our school has a teacher shortage; one teacher for two classes.", 3, ["teacher shortage"]],
    ["en", "Requesting benches and drinking water facility at the primary school. Children sit on the floor.", "Requesting benches and drinking water facility at the primary school. Children sit on the floor.", 2, ["school furniture", "drinking water"]],
  ],
  roads: [
    ["te", "వర్షాకాలంలో మా రోడ్డు పూర్తిగా బురదమయం అవుతుంది. అంబులెన్స్ కూడా రాలేదు.", "In monsoon our road becomes full of mud. Even the ambulance could not come.", 5, ["mud road", "ambulance access"]],
    ["hi", "मुख्य सड़क पर बड़े-बड़े गड्ढे हैं, रोज़ दुर्घटनाएँ होती हैं। कृपया मरम्मत करवाएँ।", "The main road has big potholes; accidents happen daily. Please get it repaired.", 4, ["potholes", "accidents"]],
    ["en", "The bridge culvert near the tank overflows every rainy season and cuts off three villages.", "The bridge culvert near the tank overflows every rainy season and cuts off three villages.", 4, ["culvert", "flooding", "connectivity"]],
    ["te", "బస్సు మా ఊరికి రావడం లేదు ఎందుకంటే రోడ్డు బాగోలేదు. విద్యార్థులు ఇబ్బంది పడుతున్నారు.", "The bus does not come to our village because the road is bad. Students suffer.", 3, ["bus connectivity", "road condition"]],
    ["ta", "உள் தெருக்கள் அனைத்தும் மண் சாலைகள். சிமெண்ட் சாலை போட்டுத் தரவும்.", "All inner streets are mud roads. Please lay cement roads.", 3, ["cc roads", "internal streets"]],
    ["en", "Street from the market to the bus stand needs urgent repair, autos refuse to ply after dark.", "Street from the market to the bus stand needs urgent repair, autos refuse to ply after dark.", 3, ["road repair", "market road"]],
  ],
  water: [
    ["te", "వారానికి ఒక్కసారే నీళ్లు వస్తున్నాయి. ట్యాంకర్ కోసం గంటలు నిలబడాలి.", "Water comes only once a week. We stand in line for hours for the tanker.", 5, ["water scarcity", "tanker dependence"]],
    ["hi", "हमारे मोहल्ले में नल का पानी नहीं आता। महिलाएँ दूर से पानी लाती हैं।", "Our colony has no tap water. Women fetch water from far away.", 4, ["no tap water", "women burden"]],
    ["en", "Borewell water is fluoride contaminated. We need a protected drinking water scheme urgently.", "Borewell water is fluoride contaminated. We need a protected drinking water scheme urgently.", 5, ["fluoride", "safe drinking water"]],
    ["te", "చెరువు ఎండిపోయింది, పశువులకు కూడా నీళ్లు లేవు.", "The tank has dried up; there is no water even for cattle.", 4, ["tank desilting", "livestock"]],
    ["ta", "குழாய் நீர் இணைப்பு எங்கள் பகுதிக்கு இன்னும் வரவில்லை.", "Piped water connection has still not reached our area.", 3, ["piped water"]],
  ],
  health: [
    ["te", "పీహెచ్‌సీలో డాక్టర్ వారానికి రెండు రోజులే వస్తారు. రాత్రి ఎమర్జెన్సీ వస్తే 30 కిలోమీటర్లు వెళ్ళాలి.", "The PHC doctor comes only two days a week. For a night emergency we must travel 30 km.", 5, ["doctor shortage", "emergency care"]],
    ["hi", "गाँव में कोई दवाखाना नहीं है। बुज़ुर्गों को इलाज के लिए शहर ले जाना पड़ता है।", "There is no clinic in the village. The elderly must be taken to town for treatment.", 4, ["no clinic", "elderly care"]],
    ["en", "Requesting a 24x7 delivery facility. Pregnant women are being referred 40 km away at night.", "Requesting a 24x7 delivery facility. Pregnant women are being referred 40 km away at night.", 5, ["maternal care", "24x7 PHC"]],
    ["te", "ఆశా వర్కర్లకు మందుల కిట్లు అందడం లేదు.", "ASHA workers are not receiving medicine kits.", 2, ["asha workers", "medicine supply"]],
  ],
  electricity: [
    ["te", "రోజూ 4-5 గంటలు కరెంటు పోతుంది. పంట మోటార్లకు రాత్రి మాత్రమే కరెంటు ఇస్తున్నారు.", "Power goes off 4-5 hours daily. Crop motors get power only at night.", 3, ["power cuts", "farm power"]],
    ["hi", "गली में स्ट्रीट लाइट नहीं है, रात में महिलाओं का निकलना मुश्किल है।", "There are no street lights in the lane; it is hard for women to go out at night.", 3, ["street lights", "women safety"]],
    ["en", "Transformer near the school has been sparking for weeks. It is dangerous for children.", "Transformer near the school has been sparking for weeks. It is dangerous for children.", 4, ["transformer", "safety hazard"]],
  ],
  sanitation: [
    ["te", "డ్రైనేజీ కాలువలు నిండిపోయి రోడ్డు మీద మురుగు నీరు నిలుస్తుంది. దోమలు పెరిగిపోయాయి.", "Drainage canals are full and sewage stagnates on the road. Mosquitoes have multiplied.", 4, ["drainage", "mosquitoes"]],
    ["hi", "कचरा उठाने की कोई व्यवस्था नहीं है, जगह-जगह ढेर लगे हैं।", "There is no garbage collection; heaps are piling up everywhere.", 3, ["garbage collection"]],
    ["en", "Community toilet near the market is unusable. Vendors and visitors have no facility.", "Community toilet near the market is unusable. Vendors and visitors have no facility.", 3, ["community toilet", "market"]],
  ],
  employment: [
    ["te", "డిగ్రీ అయిపోయిన యువతకు పని లేదు. స్కిల్ ట్రైనింగ్ సెంటర్ కావాలి.", "Graduated youth have no work. We need a skill training centre.", 3, ["youth unemployment", "skill training"]],
    ["hi", "मनरेगा का काम समय पर नहीं मिलता और भुगतान महीनों रुका रहता है।", "MGNREGA work is not given on time and payments are delayed for months.", 3, ["mgnrega", "wage delay"]],
    ["en", "Requesting a tailoring unit for the women's self-help groups; they have training but no equipment.", "Requesting a tailoring unit for the women's self-help groups; they have training but no equipment.", 2, ["shg", "tailoring unit"]],
  ],
  agriculture: [
    ["te", "కూరగాయల ధరలు పడిపోయినప్పుడు నిల్వ చేసుకోవడానికి కోల్డ్ స్టోరేజీ లేదు.", "When vegetable prices crash there is no cold storage to keep produce.", 3, ["cold storage", "price crash"]],
    ["hi", "नहर की मरम्मत नहीं हुई है, आखिरी खेतों तक पानी नहीं पहुँचता।", "The canal has not been repaired; water does not reach the last fields.", 4, ["canal repair", "tail-end irrigation"]],
    ["en", "Farmers need a soil testing centre; the nearest one is in the district headquarters.", "Farmers need a soil testing centre; the nearest one is in the district headquarters.", 2, ["soil testing"]],
  ],
};

// Ward demand profile: category weights per ward (creates hotspots).
const WARD_PROFILE = {
  w01: { education: 2, roads: 2, water: 2, health: 1, electricity: 1, sanitation: 1, employment: 1, agriculture: 2 },
  w02: { education: 1, roads: 5, water: 2, health: 2, electricity: 1, sanitation: 1, employment: 1, agriculture: 1 },
  w03: { education: 8, roads: 2, water: 2, health: 2, electricity: 1, sanitation: 1, employment: 2, agriculture: 1 },
  w04: { education: 1, roads: 4, water: 4, health: 2, electricity: 2, sanitation: 3, employment: 1, agriculture: 1 },
  w05: { education: 1, roads: 1, water: 1, health: 1, electricity: 1, sanitation: 1, employment: 2, agriculture: 3 },
  w06: { education: 2, roads: 3, water: 4, health: 5, electricity: 2, sanitation: 1, employment: 1, agriculture: 1 },
  w07: { education: 1, roads: 2, water: 2, health: 1, electricity: 2, sanitation: 2, employment: 1, agriculture: 2 },
  w08: { education: 1, roads: 1, water: 1, health: 1, electricity: 1, sanitation: 1, employment: 1, agriculture: 1 },
  w09: { education: 2, roads: 3, water: 7, health: 3, electricity: 2, sanitation: 1, employment: 1, agriculture: 1 },
  w10: { education: 1, roads: 2, water: 1, health: 1, electricity: 1, sanitation: 1, employment: 1, agriculture: 4 },
  w11: { education: 1, roads: 4, water: 2, health: 1, electricity: 2, sanitation: 1, employment: 1, agriculture: 1 },
  w12: { education: 2, roads: 1, water: 1, health: 1, electricity: 1, sanitation: 2, employment: 3, agriculture: 1 },
};

const CHANNELS = ["text", "text", "voice", "voice", "photo", "meeting", "letter", "social"];
const BASE = new Date("2026-07-03T09:00:00Z").getTime();
const DAY = 86400000;

function weightedCategory(profile) {
  const entries = Object.entries(profile);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [cat, w] of entries) {
    r -= w;
    if (r <= 0) return cat;
  }
  return entries[0][0];
}

const submissions = [];
let n = 1;
const COUNT = 132;
for (let i = 0; i < COUNT; i++) {
  const wardId = "w" + String(1 + Math.floor(rand() * 12)).padStart(2, "0");
  const category = weightedCategory(WARD_PROFILE[wardId]);
  const t = pick(TEMPLATES[category]);
  const channel = pick(CHANNELS);
  // Education requests in Chintalapadu trend recent (last 45 days) — the demo storyline.
  const maxAge = wardId === "w03" && category === "education" ? 45 : 120;
  const age = Math.floor(rand() * maxAge);
  const createdAt = new Date(BASE - age * DAY - Math.floor(rand() * DAY)).toISOString();
  submissions.push({
    id: "s" + String(n++).padStart(3, "0"),
    text: t[1],
    translatedText: t[2],
    language: t[0],
    category,
    wardId,
    channel,
    severity: t[3],
    themes: t[4],
    hasPhoto: channel === "photo",
    photoNote: channel === "photo" ? "Photo attached by citizen showing the reported issue." : undefined,
    createdAt,
  });
}

submissions.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
writeFileSync(join(here, "../src/data/submissions.json"), JSON.stringify(submissions, null, 2));
console.log(`Wrote ${submissions.length} submissions.`);
const byCat = {};
for (const s of submissions) byCat[s.category] = (byCat[s.category] || 0) + 1;
console.log(byCat);
