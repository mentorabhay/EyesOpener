// Eyes Opener: The "look and answer" clips: a still picture (or a slow, steady one), what to do, and one or more questions.
/**
 * The "look and answer" clips: a still picture (or a slow, steady one), what to do, and one or more questions.
 * Each answer carries what it means: "pass" (fine), "note" (worth knowing, nothing to fix today),
 * "fail" (something to put right before training) or "na" (does not apply to this screen).
 * The clip's outcome is the worst of its answers (src/lib/clip-rules.ts).
 *
 * In the words, {cyan} stands for the eye the cyan lens sits over for this member ("left" or "right") and {red}
 * for the other eye. The pictures are drawn in src/clips/patterns.ts under the `scene` name.
 *
 * Nothing here flashes. Two scenes move: a bar that glides across the screen and a ring that grows once for each
 * sound, well under twice a second.
 */
export type Tone = "pass" | "note" | "fail" | "na";
export interface LookOption { label: string; tone: Tone }
export interface LookQuestion { ask: string; options: readonly LookOption[] }

export interface Look {
  /** What to do before answering, one action to a line. */
  steps: readonly string[];
  questions: readonly LookQuestion[];
  /** One plain line for each way the clip can come out. */
  advice: { pass: string; note?: string; fail: string };
  /** True when the picture must reach the very edges of the screen: the scene offers "Fill the screen". */
  fill?: boolean;
}

const yes = (label: string): LookOption => ({ label, tone: "pass" });
const no = (label: string): LookOption => ({ label, tone: "fail" });
const note = (label: string): LookOption => ({ label, tone: "note" });
const na = (label: string): LookOption => ({ label, tone: "na" });

export const LOOKS: Record<string, Look> = {
  edges: {
    fill: true,
    steps: [
      "Press Fill the screen. The picture then covers the whole screen.",
      "Look at the four edges. A thin white line runs along each one, with an arrow in every corner.",
      "Press OK or tap to come back, then answer.",
    ],
    questions: [{
      ask: "How many of the four white edge lines could you see?",
      options: [yes("All four"), no("One or more was cut off")],
    }],
    advice: {
      pass: "The whole picture reaches the screen. Nothing is cut off at the edges.",
      fail: "The TV is cutting off the edges of the picture. In the TV's picture settings choose Just Scan, Screen Fit, 1:1 or Full Pixel, or switch Overscan off. Then run this clip again.",
    },
  },
  pixels: {
    steps: [
      "Sit where you normally sit. Look at the three grey squares.",
      "Then lean in close and look at them again.",
    ],
    questions: [{
      ask: "What do the three squares look like?",
      options: [yes("Smooth, even grey from my seat, with fine sharp lines up close"), no("Wavy bands, blotches or a blur")],
    }],
    advice: {
      pass: "Each dot of the picture lands on one dot of the screen. Sizes and fine depth steps can be drawn exactly.",
      fail: "The picture is being stretched. Set the browser's zoom to 100%, and set the screen to its own full resolution. On a TV choose PC or Game mode. Then run this clip again.",
    },
  },
  ghost_red: {
    steps: [
      "Put the red-cyan glasses on.",
      "Cover your {cyan} eye with your palm, so you look through the red lens only.",
      "Look at the black panel. A ring and a bar are drawn there in cyan ink.",
    ],
    questions: [{
      ask: "Through the red lens, how do the ring and the bar look?",
      options: [yes("I cannot see them at all"), note("A faint ghost"), no("Clear and easy to see")],
    }],
    advice: {
      pass: "The red lens blocks the cyan ink. The eye behind it sees only its own pictures.",
      note: "A little cyan gets through the red lens. That is usual for red-cyan glasses. The colour leak clips measure how much.",
      fail: "The red lens lets the cyan ink through. Check that these are red-cyan glasses and not red-blue or red-green ones. Then measure the leak with the two colour leak clips.",
    },
  },
  ghost_cyan: {
    steps: [
      "Put the red-cyan glasses on.",
      "Cover your {red} eye with your palm, so you look through the cyan lens only.",
      "Look at the black panel. A ring and a bar are drawn there in red ink.",
    ],
    questions: [{
      ask: "Through the cyan lens, how do the ring and the bar look?",
      options: [yes("I cannot see them at all"), note("A faint ghost"), no("Clear and easy to see")],
    }],
    advice: {
      pass: "The cyan lens blocks the red ink. The eye behind it sees only its own pictures.",
      note: "A little red gets through the cyan lens. That is usual for red-cyan glasses. The colour leak clips measure how much.",
      fail: "The cyan lens lets the red ink through. Check that these are red-cyan glasses. Then measure the leak with the two colour leak clips.",
    },
  },
  lens_eye: {
    steps: [
      "Put the red-cyan glasses on, cyan lens over your {cyan} eye.",
      "The panel shows a circle on the left and a square on the right.",
      "Cover your {red} eye with your palm and look with your {cyan} eye only.",
    ],
    questions: [{
      ask: "With your {cyan} eye alone, which shape is bright?",
      options: [yes("The circle"), no("The square"), no("Both are bright"), no("Neither")],
    }],
    advice: {
      pass: "The glasses are the right way round: the cyan lens is over your {cyan} eye.",
      fail: "The glasses are not on the right way round, or they are not on. Turn them so the cyan lens sits over your {cyan} eye and run this clip again.",
    },
  },
  glasses_on: {
    steps: [
      "Put the red-cyan glasses on.",
      "The panel shows a circle, a square and a triangle.",
      "Close or cover one eye at a time and count the shapes that are clear and bright.",
    ],
    questions: [
      { ask: "With your {red} eye alone, how many shapes are clear and bright?", options: [yes("Two"), no("Three"), no("One or none")] },
      { ask: "With your {cyan} eye alone, how many shapes are clear and bright?", options: [yes("Two"), no("Three"), no("One or none")] },
    ],
    advice: {
      pass: "The glasses are on and each eye gets its own pictures.",
      fail: "Each eye should see two shapes: its own colour and the white one. Check that the red-cyan glasses are on, and run the colour leak clips if they are.",
    },
  },
  white_merge: {
    steps: [
      "Put the red-cyan glasses on and keep both eyes open.",
      "Look at the square in the middle of the black panel for a few seconds.",
    ],
    questions: [{
      ask: "What colour is the square?",
      options: [yes("White, grey or pale"), note("Mostly red"), note("Mostly cyan (blue-green)"), note("It keeps changing between red and cyan")],
    }],
    advice: {
      pass: "The two eyes' colours join into a pale square. Both eyes are taking part.",
      note: "One colour is winning. That can be the screen and the glasses, or it can be your eyes. The eye brightness balance clip measures the screen's share, and the eye balance check-up measures yours.",
      fail: "",
    },
  },
  black_steps: {
    steps: [
      "Sit where you normally sit, in the light you normally train in.",
      "The black panel holds four faint grey squares, numbered 1 to 4. Number 1 is the faintest.",
    ],
    questions: [
      { ask: "How many of the four squares can you see?", options: [yes("All four"), yes("Three"), note("Two"), no("One or none")] },
      { ask: "Can you see a lamp, a window or yourself reflected in the black panel?", options: [yes("No"), no("Yes")] },
    ],
    advice: {
      pass: "The room is dim enough. The black field stays black and faint shapes show.",
      note: "The faintest shapes are hard to see. Dim the room a little, or turn the screen's brightness up one step.",
      fail: "The room is too bright for the black field, or light is falling on the screen. Draw a curtain, turn the screen away from the lamp or the window, and run this clip again.",
    },
  },
  ladder: {
    steps: [
      "Take the glasses off, or look through the red lens. Either way works.",
      "The panel shows six red bars. The first is at full strength. Each bar after it is dimmer.",
      "The bar with the white mark is at 15%: the level many members start training at.",
    ],
    questions: [
      { ask: "Is every bar dimmer than the bar on its left?", options: [yes("Yes, six clear steps"), no("No, two or more look the same")] },
      { ask: "Can you see the bar with the white mark?", options: [yes("Yes"), no("No")] },
    ],
    advice: {
      pass: "The screen shows the contrast steps the engine asks for, the 15% level included.",
      fail: "This screen is not showing the dim steps as they are meant to be. Run the screen tone curve clip, switch off any vivid or dynamic picture mode, and try again.",
    },
  },
  even: {
    fill: true,
    steps: [
      "Press Fill the screen. The whole screen turns one even grey.",
      "Compare the four corners with the middle.",
      "Press OK or tap to come back, then answer.",
    ],
    questions: [{
      ask: "How do the corners look next to the middle?",
      options: [yes("The same"), note("A little darker"), no("Clearly darker, or patchy")],
    }],
    advice: {
      pass: "The screen is evenly bright. A shape keeps its strength wherever it is drawn.",
      note: "The corners are a little dim. That is common and does not matter much: the games keep what matters away from the edges.",
      fail: "This screen is much dimmer at the corners. Sit square in front of it. If it stays patchy, prefer another screen for training.",
    },
  },
  warm: {
    steps: [
      "Open this device's display settings in another window, or the TV's picture menu.",
      "Look for Night light, Night Shift, Eye comfort, Reading mode or a blue-light filter.",
      "Eyes Opener cannot read this setting itself. A warm filter dims the cyan ink, which the weaker eye depends on.",
    ],
    questions: [
      { ask: "The warm colour filter on this screen is:", options: [yes("Off"), yes("It was on. I have switched it off"), no("On"), note("I cannot find the setting")] },
      { ask: "Next to a sheet of white paper in daylight, the white square looks:", options: [yes("White, or a little blue"), no("Yellow or orange"), note("I have no white paper to compare")] },
    ],
    advice: {
      pass: "No warm filter is changing the colours.",
      note: "It could not be checked fully. If the screen looks yellow in the evening, a warm filter is switching itself on: turn it off for training.",
      fail: "A warm colour filter is on. Switch it off while you train, and check that it is not set to come on by itself in the evening.",
    },
  },
  auto_bright: {
    steps: [
      "Find the small light sensor: on a phone, tablet or laptop it sits beside the camera.",
      "Cover it with a finger for ten seconds while you watch the grey square. Then take the finger away.",
      "On a TV, look in the picture menu for Eco sensor, Ambient light or Energy saving instead.",
    ],
    questions: [{
      ask: "Did the grey square get darker or brighter by itself?",
      options: [yes("No"), yes("It did. I have now switched automatic brightness off"), no("Yes"), note("I cannot tell")],
    }],
    advice: {
      pass: "The screen keeps one brightness. Contrast stays where the engine sets it.",
      note: "It could not be checked. If the screen dims when the room gets dark, switch automatic brightness off for training.",
      fail: "The screen changes its own brightness. Switch off automatic or adaptive brightness (on a TV: the eco or ambient light sensor) and run this clip again.",
    },
  },
  picture_mode: {
    steps: [
      "Open the TV's picture menu and find Picture mode.",
      "Look at the three rows of colour blocks. Each row gets a little stronger from left to right.",
    ],
    questions: [
      { ask: "Picture mode is set to:", options: [yes("Standard, Movie, Cinema, Filmmaker, Game or PC"), yes("It was Vivid, Dynamic or Sport. I have changed it"), no("Vivid, Dynamic or Sport"), na("This screen is not a TV and has no picture modes")] },
      { ask: "Can you tell the last two blocks of each row apart?", options: [yes("Yes, in all three rows"), note("No, they look the same in one or more rows")] },
    ],
    advice: {
      pass: "The picture mode leaves colours and contrast as they are sent.",
      note: "The strongest colours run together on this screen. Choose a calmer picture mode if there is one.",
      fail: "Vivid and dynamic modes push contrast and colour, which changes what each eye sees. Choose Standard, Movie, Game or PC mode.",
    },
  },
  smoothing: {
    steps: [
      "Open the TV's picture menu and look for motion smoothing. Makers call it TruMotion, Motionflow, Auto Motion Plus, Clear Motion, MEMC or Motion Enhancer.",
      "Then watch the white bar glide across the panel.",
    ],
    questions: [
      { ask: "Motion smoothing is:", options: [yes("Off"), yes("It was on. I have switched it off"), no("On"), note("I cannot find the setting"), na("This screen is not a TV")] },
      { ask: "How does the edge of the moving bar look?", options: [yes("Clean"), note("It shimmers, tears or has a halo")] },
    ],
    advice: {
      pass: "The TV shows each picture as it is sent.",
      note: "It could not be checked fully. If moving things in games leave a halo or a shimmer, look again for a motion setting and switch it off.",
      fail: "Motion smoothing makes up in-between pictures. It can smear the two eyes' pictures into each other. Switch it off, or use Game mode.",
    },
  },
  sync: {
    steps: [
      "Turn the sound on at a comfortable level.",
      "Press Play the cue. A soft sound plays five times. A ring grows on the panel at the same moment as each sound.",
    ],
    questions: [
      { ask: "The sound was:", options: [yes("Clear and comfortable"), note("Too quiet"), note("Too loud"), no("I heard nothing")] },
      { ask: "The sound came:", options: [yes("Together with the ring"), note("After the ring"), note("Before the ring"), note("I could not tell")] },
    ],
    advice: {
      pass: "Sound cues arrive in time and can be heard.",
      note: "Set the volume so the cue is clear but soft. A sound that arrives late usually comes from a wireless speaker or a sound bar: a wired one, or the TV's own speakers, keeps time better.",
      fail: "No sound was heard. Check that this tab and this device are not muted. Eyes Opener works without sound: every cue is also shown.",
    },
  },
  zero_offset: {
    steps: [
      "Take the glasses off.",
      "The black panel shows a thin white cross and a thin white ring. Each is drawn twice in the same place: once in red and once in cyan.",
      "Lean in close and look at their edges.",
    ],
    questions: [{
      ask: "Do the thin white lines have a red or a cyan edge?",
      options: [yes("No, they are clean white"), no("Yes, I can see coloured edges")],
    }],
    advice: {
      pass: "Red and cyan land in exactly the same place. A shape drawn for both eyes sits at the screen, neither in front nor behind.",
      fail: "The colours do not line up on this screen. On a TV, switch off sharpening and choose PC or Game mode. Until then, the finest depth steps are not exact here.",
    },
  },
  fine_stripes: {
    steps: [
      "Take the glasses off and lean in close.",
      "The panel shows three squares of very fine lines: red, cyan, and red next to cyan.",
    ],
    questions: [{
      ask: "How do the fine lines look in the three squares?",
      options: [yes("Crisp in all three"), no("Smeared, or the colours run into each other")],
    }],
    advice: {
      pass: "Fine red and cyan detail stays sharp. Small shapes reach each eye cleanly.",
      fail: "Fine colour detail is being smeared before it reaches the screen. This is common on a TV joined by a cable. Choose PC mode, or set the HDMI input to its full or enhanced colour format, and run this clip again.",
    },
  },
  sighting: {
    steps: [
      "Hold both arms straight out in front of you.",
      "Put your hands together so a small gap, about the size of a coin, is left between them.",
      "With both eyes open, look at the white dot on the panel through the gap.",
      "Close your left eye. Open it. Then close your right eye.",
    ],
    questions: [{
      ask: "With which eye open does the dot stay in the gap?",
      options: [note("My left eye"), note("My right eye"), note("Both, or I cannot tell")],
    }],
    advice: {
      pass: "",
      note: "This is the eye you aim with. It is a habit, like being right-handed or left-handed. It does not say which eye sees better, and other ways of testing it can give another answer.",
      fail: "",
    },
  },
};
