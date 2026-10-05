/**
 * The published work the clips are modelled on.
 *
 * How each was checked (5 October 2026). "Reused": the label and address are the ones another file of this app
 * already carries (a guide, the evidence page or the engine), where they were opened and read. "Opened": read for
 * this file. "Found": the title and the address were confirmed in a search of the publisher's or the index's pages;
 * the page itself could not be read by an automatic reader on the day, so the label gives the journal, the year and
 * the title and claims nothing more.
 */
import type { Source } from "../guides/types";

const s = (label: string, url: string): Source => ({ label, url });

/* ── the screen and the glasses ── */
/** Reused from src/engine/calibrate.ts. */
export const WOODS = s("Woods and Harris, 2010, Proceedings of SPIE: how much of the wrong colour gets through red-cyan and other coloured 3D glasses", "https://doi.org/10.1117/12.840835");
/** Reused from src/engine/calibrate.ts. */
export const BAKER_LEAK = s("Baker, Kaestner and Gouws, 2016, Journal of Vision: measuring the leak between the two eyes' pictures on displays used for vision research", "https://doi.org/10.1167/16.15.14");
/** Found. */
export const LAGOM = s("Lagom LCD monitor test pages: still test pictures for black level, sharpness, tone curve and evenness", "http://www.lagom.nl/lcd-test/");
/** From the evidence framework (the weights of red, green and blue in white's light). */
export const SRGB = s("World Wide Web Consortium: how much of white's light the red, green and blue of a standard screen carry", "https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html");
/** Reused from src/copy/monitor.ts. */
export const IRIS = s("Google Research, 2020: MediaPipe Iris, distance from the width of the iris", "https://research.google/blog/mediapipe-iris-real-time-iris-tracking-depth-estimation/");
/** Reused from the lazy-eye guides. The trial that started the stronger eye at 15% contrast. */
export const XIAO = s("Xiao and others, 2022, Ophthalmology: randomised trial of two-eye video for lazy eye in children aged 4 to 7", "https://www.sciencedirect.com/science/article/pii/S0161642021006825");

/* ── letters and stripes ── */
/** Reused from the evidence page. */
export const PEEK = s("Peek Vision: the Peek Acuity phone test (a pointing letter E) compared with clinic charts in 233 people in Kenya, published in JAMA Ophthalmology in 2015", "https://peekvision.org/resources/research/validating-our-vision-test/");
/** Found. */
export const ATS_SCREEN = s("American Journal of Ophthalmology, 2001: Computerized method of visual acuity testing, an adaptation of the Amblyopia Treatment Study visual acuity testing protocol", "https://www.sciencedirect.com/science/article/abs/pii/S0002939401012569");
/** Reused from the lazy-eye guides. */
export const CROWDING = s("Hussain and others, 2012, Journal of Neuroscience: practice reduces crowding in adults with lazy eye", "https://www.jneurosci.org/content/32/2/474");
/** Found. */
export const PELLI_BEX = s("Pelli and Bex, 2013, Vision Research: Measuring contrast sensitivity", "https://www.sciencedirect.com/science/article/pii/S0042698913001132");
/** Found. */
export const SUMMATION = s("Baker, Lygo, Meese and Georgeson, 2018, Psychological Bulletin: Binocular summation revisited: beyond the square root of two", "https://research.aston.ac.uk/en/publications/binocular-summation-revisited-beyond-2/");

/* ── balance, suppression, depth ── */
/** Found. */
export const KWON = s("Kwon, Wiecek, Dakin and Bex, 2015, Scientific Reports: Spatial-frequency dependent binocular imbalance in amblyopia (two overlapping letters, one for each eye)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4658600/");
/** Found. */
export const DOTS = s("Journal of Visualized Experiments, 2012: The measurement and treatment of suppression in amblyopia (moving dots shared out between the two eyes)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3575204/");
/** Found. */
export const WORTH = s("EyeWiki, American Academy of Ophthalmology: Worth 4 dot", "https://eyewiki.org/Worth_4_Dot");
/** Found. */
export const SUPPRESSION_MAP = s("Investigative Ophthalmology and Visual Science, 2017: Regional extent of peripheral suppression in amblyopia", "https://iovs.arvojournals.org/article.aspx?articleid=2622936");
/** Found. */
export const DOMINANCE = s("Journal of AAPOS, 2008: Results of ocular dominance testing depend on assessment method", "https://www.sciencedirect.com/science/article/abs/pii/S1091853108000736");
/** Found. */
export const RANDOT = s("PLOS One, 2019: Characterizing the Randot Preschool stereotest: testability, norms, reliability, specificity and sensitivity in children aged 2 to 11 years", "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0224402");
/** Found. */
export const DYNAMIC_DEPTH = s("BMC Ophthalmology, 2018: The effect of induced fusional demand on static and dynamic stereoacuity thresholds: the digital Synoptophore", "https://bmcophthalmol.biomedcentral.com/articles/10.1186/s12886-018-1000-2");

/* ── how the eyes turn ── */
/** Opened. Ramps of 0.5, 1 and 2 prism dioptres a second, turning out before turning in, five repeats, 29 adults at 55 cm. */
export const GAO = s("Gao and others, 2022, Clinical and Experimental Optometry: the digital fusion-range test, with ramps of 0.5, 1 and 2 prism dioptres a second in 29 adults", "https://pmc.ncbi.nlm.nih.gov/articles/PMC13035411/");
/** Reused from the convergence guides. */
export const CITT_NORMAL = s("Scheiman and others for the same trial group, 2010, Optometry and Vision Science: the home practice the trial set, and what it counted as normal", "https://pubmed.ncbi.nlm.nih.gov/20543758/");
/** Found (index record: authors, title, journal and year). */
export const GALL = s("Gall, Wick and Bedell, 1998, Optometry and Vision Science: Vergence facility: establishing clinical utility", "https://pubmed.ncbi.nlm.nih.gov/9798213/");
/** Found (index record: authors, title, journal and year). */
export const NEAR_POINT = s("Scheiman and others, 2003, Optometry and Vision Science: Nearpoint of convergence: test procedure, target selection, and normative data", "https://pubmed.ncbi.nlm.nih.gov/12637833/");
/** From the evidence framework. */
export const ADAPTATION = s("Sangoi and others, 2021, Investigative Ophthalmology and Visual Science: how the resting eye position adapts, before and after therapy, in 50 adults with convergence insufficiency and 50 without", "https://iovs.arvojournals.org/article.aspx?articleid=2776607");
/** Found. */
export const PHORIA = s("Optometry and Vision Science, 1998: Inter-examiner repeatability of heterophoria tests", "https://journals.lww.com/optvissci/abstract/1998/10000/inter_examiner_repeatability_of_heterophoria_tests.16.aspx");
/** Found. */
export const FIXATION = s("PLOS One, 2017: Individual objective and subjective fixation disparity in near vision", "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0170190");

/* ── centre of vision and field ── */
/** Reused from the grid-check guide. */
export const AMSLER = s("American Academy of Ophthalmology: Have AMD? Save your sight with an Amsler grid", "https://www.aao.org/eye-health/tips-prevention/facts-about-amsler-grid-daily-vision-test");
/** Reused from the grid-check guide. */
export const AMSLER_LIMITS = s("Faes and others, 2014, Eye: pooled studies of how well the Amsler grid finds wet macular degeneration", "https://www.nature.com/articles/eye2014104");
/** Found. */
export const WOBBLE = s("Wang and others, 2013, Investigative Ophthalmology and Visual Science: Handheld shape discrimination hyperacuity test on a mobile device for remote monitoring of visual function in maculopathy", "https://iovs.arvojournals.org/article.aspx?articleid=2128408");
/** Found. */
export const HOME_FIELD = s("Clinical Ophthalmology, 2018: Home-based visual field test for glaucoma screening, comparison with Humphrey perimeter", "https://www.dovepress.com/home-based-visual-field-test-for-glaucoma-screening-comparison-with-hu-peer-reviewed-fulltext-article-OPTH");
/** Reused from the after-stroke guides. */
export const EYE_SEARCH = s("Ong and others, 2015, Annals of Clinical and Translational Neurology: Eye-Search, a web-based therapy that improves visual search in hemianopia", "https://pubmed.ncbi.nlm.nih.gov/25642437/");

/* ── function and comfort ── */
/** Found. */
export const READING = s("Trauzettel-Klosinski and Dietz, 2012, Investigative Ophthalmology and Visual Science: Standardized assessment of reading performance: the new International Reading Speed Texts IReST", "https://iovs.arvojournals.org/article.aspx?articleid=2166061");
/** Found. */
export const CISS = s("Borsting and others, 2003, Optometry and Vision Science: Validity and reliability of the revised convergence insufficiency symptom survey in children aged 9 to 18 years", "https://pubmed.ncbi.nlm.nih.gov/15252345/");
/** Found. */
export const SCREEN_SYMPTOMS = s("Scientific Reports, 2024: CVS-Q teen: an adapted, reliable and validated tool to assess computer vision syndrome in adolescents", "https://www.nature.com/articles/s41598-024-70821-9");
/** Found. */
export const DRY_EYE = s("Diagnostics, 2020: A review of dry eye questionnaires: measuring patient-reported outcomes and health-related quality of life", "https://www.mdpi.com/2075-4418/10/8/559");
/** Reused from src/copy/monitor.ts. */
export const BLINKS = s("Freudenthaler and others, 2003, Graefe's Archive: blinking during screen use in 51 healthy adults", "https://link.springer.com/article/10.1007/s00417-003-0786-6");
/** Reused from the screen-strain guides. */
export const DESK = s("Occupational Safety and Health Administration (United States): computer workstations, monitors", "https://www.osha.gov/etools/computer-workstations/components/monitors");
/** Reused from the after-concussion guides. */
export const VOMS = s("Mucha and others, 2014, American Journal of Sports Medicine: a brief Vestibular/Ocular Motor Screening (VOMS) assessment to evaluate concussions", "https://pubmed.ncbi.nlm.nih.gov/25106780/");
