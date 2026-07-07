import { GoogleGenAI } from "npm:@google/genai@^2.10.0";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'query' string" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Identify this houseplant and its typical watering needs: "${query}". If the query is ambiguous or informal (e.g. "my new plant"), make your best reasonable guess for a common houseplant.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Common name of the plant, cleaned up (e.g. 'Pothos').",
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
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
