import { GoogleGenAI } from "npm:@google/genai@^2.10.0";
import { encode } from "npm:base64-arraybuffer@^1.0.2";

const ai = new GoogleGenAI({ apiKey: Deno.env.get("GEMINI_API_KEY") });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlantInfoInput = {
  name: string;
  species: string;
  wateringFrequencyDaysMin: number;
  wateringFrequencyDaysMax: number;
};

type PlantPhotoInfoInput = {
  status: "found" | "ambiguous" | "not_found";
  name: string;
  species: string;
  wateringFrequencyDaysMin: number;
  wateringFrequencyDaysMax: number;
  candidateNames: string[];
};

// Maps the app's locale to the language Gemini should respond in. Only
// the common name (and, for the photo variant, candidateNames) follow
// this -- species is always the Latin binomial, which is universal, not
// localized. Defaults to English for callers that don't send a locale.
function languageNameFor(locale: unknown): string {
  return locale === "pt-PT" ? "European Portuguese (Portugal, not Brazilian Portuguese)" : "English";
}

async function lookupByQuery(query: string, locale: unknown): Promise<Response> {
  const languageName = languageNameFor(locale);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Identify this houseplant and its typical watering needs: "${query}". If the query is ambiguous or informal (e.g. "my new plant"), make your best reasonable guess for a common houseplant. Respond with the common name in ${languageName}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: `Common name of the plant in ${languageName}, cleaned up (e.g. 'Pothos').`,
          },
          species: {
            type: "string",
            description: "Latin binomial species name (e.g. 'Epipremnum aureum').",
          },
          wateringFrequencyDaysMin: {
            type: "integer",
            description: "Minimum days between waterings for a typical healthy specimen.",
          },
          wateringFrequencyDaysMax: {
            type: "integer",
            description:
              "Maximum days between waterings for a typical healthy specimen. Equal to min if there's a single well-known frequency.",
          },
        },
        required: ["name", "species", "wateringFrequencyDaysMin", "wateringFrequencyDaysMax"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Model returned no output");
  }

  const input = JSON.parse(response.text) as PlantInfoInput;

  // Deterministic rounding lives here, not left to the model's own math.
  const wateringFrequencyDays = Math.floor(
    (input.wateringFrequencyDaysMin + input.wateringFrequencyDaysMax) / 2,
  );

  return new Response(
    JSON.stringify({
      name: input.name,
      species: input.species,
      wateringFrequencyDays,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function lookupByPhoto(photoUrl: string, hint: string | undefined, locale: unknown): Promise<Response> {
  const languageName = languageNameFor(locale);
  const photoResponse = await fetch(photoUrl);
  if (!photoResponse.ok) {
    throw new Error(`Could not fetch photo: ${photoResponse.status}`);
  }
  const photoBytes = await photoResponse.arrayBuffer();
  const photoBase64 = encode(photoBytes);

  const hintText = hint
    ? ` The user suggests it might be called "${hint}" -- consider this, but verify it against the photo rather than assuming it's correct.`
    : "";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        text: `Identify the houseplant in this photo and its typical watering needs.${hintText} Return status "found" if you can confidently identify a single common name and species from the photo. Return status "ambiguous" if multiple common names/species are plausible from the photo alone, and list 2-5 of them as candidateNames. Return status "not_found" if no houseplant is recognizable in the photo at all. Respond with the common name and any candidateNames in ${languageName}.`,
      },
      { inlineData: { mimeType: "image/jpeg", data: photoBase64 } },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["found", "ambiguous", "not_found"],
            description: "Whether a single plant was confidently identified, several are plausible, or none.",
          },
          name: {
            type: "string",
            description: `Common name of the plant in ${languageName} if status is 'found', cleaned up (e.g. 'Pothos'); empty string otherwise.`,
          },
          species: {
            type: "string",
            description: "Latin binomial species name if status is 'found' (e.g. 'Epipremnum aureum'); empty string otherwise.",
          },
          wateringFrequencyDaysMin: {
            type: "integer",
            description: "Minimum days between waterings for a typical healthy specimen if status is 'found'; 0 otherwise.",
          },
          wateringFrequencyDaysMax: {
            type: "integer",
            description:
              "Maximum days between waterings for a typical healthy specimen if status is 'found', equal to min if there's a single well-known frequency; 0 otherwise.",
          },
          candidateNames: {
            type: "array",
            items: { type: "string" },
            description: `2-5 plausible common names in ${languageName} if status is 'ambiguous'; empty array otherwise.`,
          },
        },
        required: [
          "status",
          "name",
          "species",
          "wateringFrequencyDaysMin",
          "wateringFrequencyDaysMax",
          "candidateNames",
        ],
      },
    },
  });

  if (!response.text) {
    throw new Error("Model returned no output");
  }

  const input = JSON.parse(response.text) as PlantPhotoInfoInput;

  const wateringFrequencyDays =
    input.status === "found"
      ? Math.floor((input.wateringFrequencyDaysMin + input.wateringFrequencyDaysMax) / 2)
      : 0;

  return new Response(
    JSON.stringify({
      status: input.status,
      name: input.name,
      species: input.species,
      wateringFrequencyDays,
      candidateNames: input.candidateNames,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (typeof body.photoUrl === "string" && body.photoUrl.length > 0) {
      const hint = typeof body.hint === "string" && body.hint.length > 0 ? body.hint : undefined;
      return await lookupByPhoto(body.photoUrl, hint, body.locale);
    }

    if (typeof body.query === "string" && body.query.length > 0) {
      return await lookupByQuery(body.query, body.locale);
    }

    return new Response(JSON.stringify({ error: "Missing 'query' or 'photoUrl' string" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
