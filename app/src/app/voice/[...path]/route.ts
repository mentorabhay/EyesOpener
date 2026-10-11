// Eyes Opener: The address audio is played from: GET /voice/<language>/<kind>/<item>/<part>.<hash>.mp3.
/**
 * The address audio is played from: GET /voice/<language>/<kind>/<item>/<part>.<hash>.mp3
 * Everything it does, and every check, is in src/voice/serve.ts. This file only joins it to the server's settings.
 */
import { siteLock } from "@/lib/gate";
import { serveVoice } from "@/voice/serve";
import { voiceStore } from "@/voice/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

const answer = async (req: Request, ctx: Ctx) => serveVoice(req, (await ctx.params).path, voiceStore(), { locked: !!siteLock() });

export const GET = answer;
export const HEAD = answer;
