// Eyes Opener: Words for the two screen tools that go with exercises (the reading tool and the grid check).
/**
 * Words for the two screen tools that go with exercises (the reading tool and the grid check)
 * and for the printable cards. Plain words a school student can follow.
 */

import { texts } from "@/i18n/texts";

const squares = (n: number) => (n === 0 ? "No squares marked" : n === 1 ? "1 square marked" : `${n} squares marked`);

/** Short passages for the reading tool. Written for IOpener; everyday subjects, no real people, 90 to 130 words each. */
export const passages: string[] = texts("copy/drills-tools", "passages", () => ([
  "The market opens early. I take a cloth bag and walk down the lane while the air is still cool. The first stall sells tomatoes, onions and green chillies in neat piles. The woman there knows what I like and picks the firm ones for me. Next I stop for a bunch of fresh coriander and two lemons. A boy pushes a cart of bananas past us and calls out the price. I count my coins, pay, and put the change in my pocket. On the way home the bag is heavy, so I swap hands at each corner. By the time I reach the door the sun is warm on my back.",
  "First I fill the small pan with one cup of water and set it on the stove. While it heats, I crush a piece of ginger and two pods of cardamom. When the water starts to bubble I add the ginger, the cardamom and a spoon of tea leaves. The smell fills the kitchen at once. I let it boil for a minute, then pour in half a cup of milk and stir in the sugar. The tea rises to the edge of the pan, so I lower the flame and wait. When the colour turns a deep brown I strain it into two cups. One is for me. The other is for whoever comes to the door first.",
  "It has rained since morning. The drops run down the window and gather on the sill. Out in the street the children have folded paper boats and set them in the stream beside the kerb. A man walks past under a wide black umbrella, and his shoes splash in every puddle. The crows have gone quiet and sit close together on the wire. Inside, the room is dim, so we switch on the lamp and bring out a board game. Someone fries a plate of hot snacks in the kitchen. The rain drums on the tin roof next door. Nobody minds. On a day like this there is nowhere else we need to be.",
  "The bus comes at ten past eight. I climb the two steps, buy a ticket and find a seat by the window. The engine shakes, the doors fold shut and we pull away from the stop. At first the road is full of shops with their shutters half open. Then the houses thin out and the fields begin. A farmer is leading two oxen along a narrow path. Farther on, a line of washing swings behind a small house. The bus slows for a goat that will not move, and everyone laughs. At the river bridge the wind comes in cool and smells of wet earth. Three more stops and I will be there.",
  "The garden behind the house is small, but there is always something to do in it. This morning I pull out the weeds that came up after the rain. Then I loosen the soil around the tomato plants with a little fork. Two of them have yellow flowers already. The mint has spread too far again, so I cut it back and keep a handful for the kitchen. A sparrow hops along the wall and watches me work. I fill the can at the tap and water each pot slowly, until the earth turns dark. Last of all I sweep the path. Then I sit on the step and look at what I have done.",
  "On windy afternoons we take the kite up to the roof. It is made of thin red paper and two sticks of bamboo, with a long tail of ribbon. My cousin holds it high above his head while I walk back with the string. When the wind pulls, he lets go. The kite dips, turns and then climbs fast. I let the string run through my fingers, a little at a time. Soon it is only a small red spot above the trees. Other kites are up as well, green and yellow and white. We stay until the light turns gold. Then I wind the string in, turn by turn, and we carry the kite down the stairs.",
  "The library is a quiet room at the end of the school corridor. Tall shelves stand along three walls, and a long table fills the middle. I like to go there after lunch. The books about animals are on the lowest shelf, so I sit on the floor to choose one. Today I pick a book about birds that fly across the sea each winter. The pages are thick and the pictures are bright. I write the title on a card and hand it to the teacher at the desk. She stamps the date inside the cover. I have two weeks to read it. I carry it home under my arm so the corners do not bend.",
  "When the light begins to fade, we start the evening meal. One of us washes the rice three times and leaves it to soak. Another chops the onions as finely as she can. The lentils go into the big pot with water, salt and a pinch of yellow spice. Soon the lid starts to rattle. Oil heats in a small pan, and the seeds we drop into it pop and jump. We pour them over the lentils and the kitchen fills with a warm smell. The plates are set out on the mat. Everyone sits down together, the youngest nearest the door. For a while nobody talks, because the food is hot and good.",
]));

export const tools = texts("copy/drills-tools", "tools", () => ({
  reading: {
    how: [
      "Find the thick bar on the left first. The line starts just after it.",
      "Read across to the thin bar on the right. The line ends just before it.",
      "Then press \"Next line\". Take your time: this is practice, not a race.",
    ],
    size: "Text size",
    sizes: ["Large", "Larger", "Largest"],
    length: "Line length",
    lengths: ["Short lines", "Medium lines"],
    line: "The line to read",
    sample: "A sample line. Reading starts when you press the button.",
    counter: (n: number, of: number) => `Line ${n} of ${of}`,
    next: "Next line",
    back: "Back",
    keys: "Keyboard: Space, Enter or the right arrow for the next line. The left arrow goes back one line.",
    start: "Start reading",
    again: "Read again",
    save: "Save this reading",
    pause: "Pause",
    resume: "Carry on",
    paused: "Paused. The clock has stopped.",
    lines: "Lines finished",
    speed: "Words a minute",
    speedLater: "The speed shows after 3 lines and 20 seconds of reading.",
  },
  grid: {
    intro: "This check takes about two minutes. Wear your reading glasses if you use them, and sit in good light.",
    hold: (cm: number) => `Hold the screen about ${cm} cm from your eye.`,
    notMeasured: "This screen has not been measured, so the grid may not be exactly 10 cm wide.",
    step: (n: number) => `Step ${n} of 4`,
    eye: { right: "Right eye", left: "Left eye" },
    cover: {
      right: "Cover your left eye. Look only at the dot in the middle with your right eye.",
      left: "Cover your right eye. Look only at the dot in the middle with your left eye.",
    },
    ready: "I am looking at the dot",
    mark: "Without moving your eye from the dot, tap every square where the lines look bent, blurred or missing.",
    clear: "Tap a marked square again to clear it.",
    done: { right: "Right eye done", left: "Left eye done" },
    keys: "Keyboard: press Tab to reach the grid, move with the arrow keys, and press Space to mark or clear a square.",
    label: {
      plain: "A grid of 20 squares by 20 with a dot in the middle",
      right: "Grid for the right eye: 20 squares by 20 with a dot in the middle",
      left: "Grid for the left eye: 20 squares by 20 with a dot in the middle",
    },
    cell: (row: number, column: number, on: boolean) => `Row ${row}, column ${column}: ${on ? "marked" : "not marked"}.`,
    marked: squares,
    notChecked: "Not checked",
    summary: "Summary",
    warn: "You marked squares. Lines that look bent, blurred or missing can be an early sign of a change at the centre of the eye. See an eye doctor this week. If it is new or sudden, go the same day.",
    none: "No squares marked. Check again next week, one eye at a time.",
    unfinished: "The check was not finished for both eyes. Start it again to check each eye.",
    notExam: "This check does not replace an eye exam.",
    start: "Start the check",
    again: "Check again",
    save: "Save this check",
  },
}));

export const print = texts("copy/drills-tools", "print", () => ({
  crumb: "Exercises",
  sub: "A card to print for this routine, drawn to its real size.",
  button: "Print",
  howTitle: "How to use it",
  printTitle: "Before you print",
  size: "Print at 100% size (\"actual size\"), not \"fit to page\".",
  check: "A 50 mm check line is printed on each card. Measure it with a ruler. If it is not 50 mm long, the card is the wrong size: print again at 100%.",
  paper: "Use white A4 paper. Thin card is better, or glue the paper onto card.",
  sheets: "What will be printed",
  sheet: (n: number, of: number) => `Sheet ${n} of ${of}`,
  back: "Back to the exercise",
  /** Printed on every sheet. */
  line: "This line is 50 mm long",
  measure: "Measure it with a ruler. If it is not 50 mm, print again at 100% size.",
  cards: {
    barrel: {
      title: "Barrel card",
      how: [
        "Print in colour, then cut along the solid outer line.",
        "Fold along the dashed line with the barrels on the outside. Glue or tape the two halves together. The red barrels are now on one side and the green barrels on the other.",
        "Hold the card by its lower edge, straight out in front of you, with the nose end touching the tip of your nose. One eye sees the red side and the other eye sees the green side.",
        "Look at the largest barrel, the one farthest from you. Pull your eyes in until it is one barrel in a mix of red and green. The two nearer barrels look double: that is right.",
        "Hold it for a count of 5. Then do the middle barrel, then the smallest one.",
      ],
      on: {
        nose: "Nose end",
        cut: "Cut along the solid line.",
        fold: "Fold along the dashed line, barrels on the outside. Glue the two halves together.",
        use: "Hold the nose end on the tip of your nose, the card straight out in front of you. Look at the largest barrel until it is one barrel in red and green mixed. Then the middle one. Then the smallest.",
      },
    },
    dots: {
      title: "Dot card",
      how: [
        "Cut along the solid outer line. Glue the strip onto thin card if the paper is soft.",
        "Hold the nose end against the tip of your nose. Point the strip straight ahead and tilt it slightly down.",
        "Look at the dot farthest from you. When it is one dot, the line looks like two lines that meet at that dot.",
        "Hold it for a count of 5. Then step to the next dot toward your nose.",
        "The number beside each dot is how far it is from your nose in centimetres. Note the nearest dot you kept single.",
      ],
      on: {
        nose: "Nose end",
        cm: "cm",
        cut: "Cut along the solid line.",
        use: "Hold the nose end on the tip of your nose and tilt the strip slightly down. Look at the farthest dot until it is one dot. Count to 5. Step to the next dot toward your nose. The numbers are centimetres from your nose.",
      },
    },
    lifesaver: {
      title: "Lifesaver card",
      how: [
        "Cut along the solid outer line. Hold the card about 40 cm from your eyes.",
        "Start with row 1. Hold a pen tip half way between your eyes and the card, in front of the two rings, and look at the pen tip.",
        "Move the pen slowly toward you until a third ring appears between the two rings. Look at that middle ring.",
        "It is right when you can read CLEAR on the middle ring. You also see two small dots in its hole, one above the other, and the hole seems to float toward you.",
        "If one of the two dots is missing, one eye has switched off. Blink, look away and try again.",
        "Hold it for a count of 5. Rows 2, 3 and 4 are each harder: move on only when the row before is easy.",
      ],
      on: {
        word: "CLEAR",
        row: "Row",
        cut: "Cut along the solid line.",
        use: "Hold the card 40 cm away. Cross your eyes until a third ring appears between the two. It is right when you can read CLEAR on it and see two dots in its hole, one above the other.",
      },
    },
    letters: {
      title: "Letter chart and near cards",
      how: [
        "Sheet 1 is the far chart. Pin it to a wall at eye level, in good light, and stand 3 metres away.",
        "Sheet 2 has four small cards with the same letters. Cut one out and hold it 40 cm from your eyes. The others are spares.",
        "Read a letter on the far chart, then the next letter on the small card, and keep swapping. To warm up, swap after each whole line instead.",
        "Wait until the letters are clear each time before you read them.",
      ],
      on: {
        far: "Far chart: pin to a wall and read from 3 m",
        near: "Near card: hold at 40 cm",
        cut: "Cut along the solid lines. One card is enough: the others are spares.",
      },
    },
    letter: {
      title: "Letter targets",
      how: [
        "For a letter on the wall: pin the sheet up at eye level. Use the big letter first, and the row of small letters when the big one is easy.",
        "For push-ups: cut out the strip along the dashed line and tape it round the end of a pen, with the small letter facing you.",
        "Then follow the steps on the exercise page.",
      ],
      on: {
        wall: "Pin this sheet to a wall at eye level.",
        strip: "For push-ups: cut out this strip and tape it round the end of a pen, with the letter facing you.",
      },
    },
    grid: {
      title: "Grid check",
      how: [
        "Wear your reading glasses if you use them. Hold the page about 30 cm from your eye, in good light.",
        "Cover your left eye. Look only at the dot in the middle of the first grid with your right eye.",
        "Without moving your eye from the dot, mark with a pen every square where the lines look bent, blurred or missing.",
        "Do the same on the second grid with your left eye, covering your right eye.",
        "Write the date and keep the page, so you can compare it with next week's.",
        "Lines that look bent, blurred or missing can be an early sign of a change at the centre of the eye. If you marked any square, see an eye doctor this week. If it is new or sudden, go the same day.",
      ],
      on: {
        right: "Right eye (cover your left eye)",
        left: "Left eye (cover your right eye)",
        date: "Date",
        steps: [
          "Wear your reading glasses if you use them.",
          "Hold the page about 30 cm from your eye.",
          "Cover one eye. Look only at the dot in the middle.",
          "Without moving your eye from the dot, mark every square where the lines look bent, blurred or missing.",
          "Then do the other eye on the other grid.",
        ],
        ifMarked: "If you marked any square: lines that look bent, blurred or missing can be an early sign of a change at the centre of the eye. See an eye doctor this week. If it is new or sudden, go the same day.",
        ifNone: "No squares marked: check again next week, one eye at a time.",
      },
    },
    pairs: {
      title: "Stereogram pairs",
      how: [
        "Hold the page about 40 cm from your eyes. Start with pair 1.",
        "Hold a pen tip half way between your eyes and the page, in front of the pair, and look at the pen tip.",
        "Move the pen slowly toward you until a third ring appears in the middle. Look at that middle ring.",
        "It is right when the middle ring is clear and the small shape inside sits at a different depth from the ring. It is in front of the ring in pairs 1 and 3, and behind it in pair 2.",
        "Hold it for a count of 5. Then try it without the pen.",
        "This printed card is for crossing the eyes. To practise relaxing them, use the pairs on screen.",
      ],
      on: {
        pair: "Pair",
        use: "Hold the page 40 cm away. Cross your eyes until a third ring appears in the middle. The small shape floats in front of the ring in pairs 1 and 3, and behind it in pair 2.",
      },
    },
  },
}));
