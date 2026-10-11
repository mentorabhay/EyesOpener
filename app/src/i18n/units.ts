// Eyes Opener: Units of measure, and how each is written in each language.
/**
 * Units of measure, and how each is written in each language.
 *
 * A dose is a number and a unit: "20 minutes", "40 cm", "2 times a day". A translation that turns minutes into
 * hours, or drops the unit, is wrong in the one place where wrong matters most. So src/i18n/check.ts finds every
 * number with a unit in the English sentence and requires the same number with the same unit in the translation.
 *
 *   - A unit written as a sign (cm, mm, m, km, %, px, Hz, s, min, D) stays exactly as it is in every language.
 *   - A unit written as a word (minutes, weeks, times) is written in the language's own word, from the list
 *     below, or left in English. Each word here is the start of the word, so its endings pass too.
 *
 * The lists for languages other than Hindi and Urdu were written without a native reviewer. A wrong or missing
 * word can only make the check refuse a good translation (the English sentence is then shown); it cannot let a
 * changed unit through, because each list holds words for that one unit only. Each language's reviewer should
 * read their column once.
 */
import type { Lang } from "./languages";

type Other = Exclude<Lang, "en">;

/** Signs. Matched after a number, with or without a space, and kept as they are. Longest first. */
export const UNIT_SIGNS = ["mm", "cm", "km", "ms", "min", "px", "Hz", "kB", "MB", "%", "°", "m", "s", "D"] as const;

export interface UnitWord {
  /** How English writes it: a pattern for the word after a number. */
  en: string;
  in: Record<Other, readonly string[]>;
}

export const UNIT_WORDS: Record<string, UnitWord> = {
  second: { en: "seconds?", in: { hi: ["सेकंड", "सेकेंड", "सेकण्ड"], bn: ["সেকেন্ড"], ta: ["விநாடி", "வினாடி", "நொடி"], te: ["సెకన్", "సెకండ్", "సెకను"], mr: ["सेकंद"], gu: ["સેકન્ડ", "સેકંડ"], kn: ["ಸೆಕೆಂಡ್", "ಸೆಕೆಂಡು", "ಸೆಕೆಂಡ"], ml: ["സെക്കൻഡ്", "സെക്കന്റ്", "സെക്കൻറ്"], ur: ["سیکنڈ"], pa: ["ਸਕਿੰਟ", "ਸੈਕਿੰਡ"] } },
  minute: { en: "minutes?", in: { hi: ["मिनट"], bn: ["মিনিট"], ta: ["நிமிட"], te: ["నిమిష", "నిమిషా"], mr: ["मिनिट"], gu: ["મિનિટ"], kn: ["ನಿಮಿಷ"], ml: ["മിനിറ്റ", "മിനിട്ട", "മിനുട്ട"], ur: ["منٹ"], pa: ["ਮਿੰਟ"] } },
  hour: { en: "hours?", in: { hi: ["घंटे", "घंटा", "घंटों", "घण्टे", "घण्टा"], bn: ["ঘণ্টা", "ঘন্টা"], ta: ["மணி"], te: ["గంట"], mr: ["तास"], gu: ["કલાક"], kn: ["ಗಂಟೆ"], ml: ["മണിക്കൂ"], ur: ["گھنٹ"], pa: ["ਘੰਟ"] } },
  day: { en: "days?", in: { hi: ["दिन"], bn: ["দিন"], ta: ["நாள்", "நாட்க", "நாள"], te: ["రోజు", "రోజుల"], mr: ["दिवस"], gu: ["દિવસ"], kn: ["ದಿನ"], ml: ["ദിവസ"], ur: ["دن"], pa: ["ਦਿਨ"] } },
  week: { en: "weeks?", in: { hi: ["सप्ताह", "हफ़्त", "हफ्त"], bn: ["সপ্তাহ"], ta: ["வார"], te: ["వార"], mr: ["आठवड"], gu: ["અઠવાડિ"], kn: ["ವಾರ"], ml: ["ആഴ്ച"], ur: ["ہفت"], pa: ["ਹਫ਼ਤ", "ਹਫਤ"] } },
  month: { en: "months?", in: { hi: ["महीन", "माह"], bn: ["মাস"], ta: ["மாத"], te: ["నెల"], mr: ["महिन"], gu: ["મહિન"], kn: ["ತಿಂಗಳ"], ml: ["മാസ"], ur: ["مہین", "ماہ"], pa: ["ਮਹੀਨ"] } },
  year: { en: "years?", in: { hi: ["साल", "वर्ष"], bn: ["বছর"], ta: ["ஆண்டு", "வருட"], te: ["సంవత్సర", "ఏళ్ల", "ఏళ్ళ"], mr: ["वर्ष"], gu: ["વર્ષ"], kn: ["ವರ್ಷ"], ml: ["വർഷ", "കൊല്ല"], ur: ["سال"], pa: ["ਸਾਲ"] } },
  /* "times" counts ("3 times a day") and multiplies ("3 times as large"): both words are listed, the counting ones first */
  time: { en: "times?", in: { hi: ["बार", "गुना", "गुनी", "गुने"], bn: ["বার", "গুণ"], ta: ["முறை", "தடவை", "மடங்கு"], te: ["సార్లు", "సారి", "రెట్లు"], mr: ["वेळ", "पट"], gu: ["વાર", "વખત", "ગણ"], kn: ["ಬಾರಿ", "ಸಲ", "ಪಟ್ಟು"], ml: ["തവണ", "പ്രാവശ്യ", "മടങ്ങ"], ur: ["بار", "مرتبہ", "دفعہ", "گنا"], pa: ["ਵਾਰ", "ਗੁਣਾ"] } },
  metre: { en: "(?:metres?|meters?)", in: { hi: ["मीटर"], bn: ["মিটার"], ta: ["மீட்டர்", "மீட்டர"], te: ["మీటర్", "మీటర"], mr: ["मीटर"], gu: ["મીટર"], kn: ["ಮೀಟರ್", "ಮೀಟರ"], ml: ["മീറ്റർ", "മീറ്റ"], ur: ["میٹر"], pa: ["ਮੀਟਰ"] } },
  centimetre: { en: "(?:centimetres?|centimeters?)", in: { hi: ["सेंटीमीटर", "सेमी"], bn: ["সেন্টিমিটার"], ta: ["சென்டிமீட்ட", "செண்டிமீட்ட"], te: ["సెంటీమీట", "సెంటిమీట"], mr: ["सेंटीमीटर", "सेंटिमीटर"], gu: ["સેન્ટિમીટર", "સેન્ટીમીટર"], kn: ["ಸೆಂಟಿಮೀಟ", "ಸೆಂಟೀಮೀಟ"], ml: ["സെന്റിമീറ്റ", "സെൻ്റിമീറ്റ"], ur: ["سینٹی میٹر", "سنٹی میٹر"], pa: ["ਸੈਂਟੀਮੀਟਰ"] } },
  step: { en: "steps?", in: { hi: ["कदम", "क़दम", "चरण"], bn: ["ধাপ", "পা"], ta: ["அடி", "படி"], te: ["అడుగు", "దశ"], mr: ["पावल", "पाऊल", "पायऱ्या"], gu: ["પગલ", "ડગલ"], kn: ["ಹೆಜ್ಜೆ", "ಹಂತ"], ml: ["ചുവട", "ഘട്ട"], ur: ["قدم"], pa: ["ਕਦਮ"] } },
  percent: { en: "(?:percent|per cent)", in: { hi: ["प्रतिशत", "फ़ीसदी", "फीसदी"], bn: ["শতাংশ"], ta: ["சதவீத", "சதவிகித"], te: ["శాతం"], mr: ["टक्के", "प्रतिशत"], gu: ["ટકા"], kn: ["ಪ್ರತಿಶತ", "ಶೇಕಡ"], ml: ["ശതമാന"], ur: ["فیصد", "فی صد"], pa: ["ਪ੍ਰਤੀਸ਼ਤ", "ਫ਼ੀਸਦੀ"] } },
  dioptre: { en: "(?:prism dioptres?|dioptres?|diopters?)", in: { hi: ["डायोप्टर", "प्रिज़्म डायोप्टर", "प्रिज्म डायोप्टर"], bn: ["ডায়োপ্টার"], ta: ["டையாப்டர", "டயாப்டர"], te: ["డయాప్టర"], mr: ["डायोप्टर"], gu: ["ડાયોપ્ટર"], kn: ["ಡಯಾಪ್ಟರ"], ml: ["ഡയോപ്റ്റ"], ur: ["ڈائیوپٹر", "ڈایوپٹر"], pa: ["ਡਾਇਓਪਟਰ"] } },
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/**
 * What a unit follows: a number, or the place where the app writes one ("{n} minutes", "{cm} cm"). A sentence
 * with such a place is a dose as much as one with the figure written out, and its unit is held just as firmly.
 */
const NUMBER = "\\d+(?:[.,]\\d+)*|\\{[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*\\}";
/** A number, then perhaps a space or a hyphen, then a sign that is not the start of a longer word. */
const SIGN = new RegExp(`(${NUMBER})[\\s\\u00A0-]?(${UNIT_SIGNS.map(esc).join("|")})(?![A-Za-z\\u00C0-\\u024F])`, "g");
const WORD = new RegExp(`(${NUMBER})[\\s\\u00A0-]?(?:${Object.entries(UNIT_WORDS).map(([id, u]) => `(?<${id}>${u.en})`).join("|")})\\b`, "gi");

export interface Measure {
  number: string; unit: string; sign: boolean;
  /**
   * The number this one shares its unit with, where the English says "5 of 20 minutes", "10 to 15 minutes" or
   * "5 or 10 minutes": both are minutes, and another language may put the word after either ("20 में से 5 मिनट").
   */
  with?: string;
}

/** The number before "of", "out of", "to", "or" or a dash, right in front of a measure. */
const PAIRED = new RegExp(`(${NUMBER})\\s*(?:out of|of|to|or|-|\\u2013)\\s*$`, "i");

/** Every number with a unit in an English sentence: "40 cm" and "20 minutes" give [40 cm, 20 minute]. */
export function measuresOf(english: string): Measure[] {
  const out: Measure[] = [];
  const paired = (at: number) => { const m = PAIRED.exec(english.slice(0, at)); return m ? { with: m[1] } : {}; };
  for (const m of english.matchAll(SIGN)) out.push({ number: m[1], unit: m[2], sign: true, ...paired(m.index) });
  for (const m of english.matchAll(WORD)) {
    const unit = Object.keys(m.groups ?? {}).find((k) => m.groups![k] !== undefined);
    if (unit) out.push({ number: m[1], unit, sign: false, ...paired(m.index) });
  }
  return out;
}

/**
 * Is this measure in the translation, with the same number and the same unit? The unit follows the number, with
 * at most a space or a hyphen between. For a pair that shares one unit, it may follow either of the two.
 */
export function hasMeasure(text: string, m: Measure, lang: Other): boolean {
  const forms = m.sign ? `${esc(m.unit)}(?![A-Za-z\\u00C0-\\u024F])` : `(?:${[...UNIT_WORDS[m.unit].in[lang].map(esc), UNIT_WORDS[m.unit].en].join("|")})`;
  const after = (number: string) => new RegExp(`(?<![\\d.,])${esc(number)}[\\s\\u00A0-]${m.sign ? "?" : "{0,2}"}${forms}`, m.sign ? "" : "i").test(text);
  return after(m.number) || (m.with !== undefined && after(m.with));
}
