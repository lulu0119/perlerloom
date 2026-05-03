import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PatternCell, PatternSettings } from "@perlerloom/core";

export type SavedPatternPayload = {
  ownerId: string;
  version: 1;
  title: string;
  dimensions: {
    width: number;
    height: number;
  };
  paletteBrand: "mard";
  cells: PatternCell[];
  settings: PatternSettings;
  editorSettings: {
    textStyle: "blackWithWhiteOutline" | "whiteWithBlackOutline";
    smallGridColor: string;
    majorGridColor: string;
  };
  history: {
    past: unknown[];
    future: unknown[];
  };
};

export type SharePayload = {
  patternId: string;
  createdBy: string;
  access: "readOnly";
};

export type ExportMetadata = {
  attributionUrl: string;
  qrPayload: string;
};

export function validateSavedPatternPayload(payload: SavedPatternPayload): SavedPatternPayload {
  if (payload.ownerId.length === 0) {
    throw new Error("Saved pattern payload requires an owner id.");
  }
  if (payload.version !== 1) {
    throw new Error("Saved pattern payload has an unsupported version.");
  }
  if (payload.dimensions.width < 1 || payload.dimensions.height < 1 || payload.dimensions.width > 256 || payload.dimensions.height > 256) {
    throw new Error("Saved pattern dimensions must be between 1 and 256.");
  }
  if (payload.cells.length !== payload.dimensions.width * payload.dimensions.height) {
    throw new Error("Saved pattern dimensions do not match cell data.");
  }
  if (payload.paletteBrand !== "mard") {
    throw new Error("Only Mard palette patterns are supported in the MVP.");
  }

  return payload;
}

export function createSharePayload(patternId: string, createdBy: string): SharePayload {
  if (patternId.length === 0 || createdBy.length === 0) {
    throw new Error("Share payload requires pattern and creator identifiers.");
  }

  return {
    patternId,
    createdBy,
    access: "readOnly"
  };
}

export function createExportMetadata(shareUrl: string): ExportMetadata {
  return {
    attributionUrl: "https://perlerloom.app",
    qrPayload: shareUrl
  };
}

export function createSupabaseBrowserClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl === undefined || supabaseAnonKey === undefined) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function savePatternDocument(
  supabase: SupabaseClient,
  payload: SavedPatternPayload
): Promise<{ patternId: string }> {
  const validPayload = validateSavedPatternPayload(payload);
  const { data, error } = await supabase
    .from("patterns")
    .insert({
      owner_id: validPayload.ownerId,
      title: validPayload.title,
      version: validPayload.version,
      width: validPayload.dimensions.width,
      height: validPayload.dimensions.height,
      palette_brand: validPayload.paletteBrand,
      document: validPayload
    })
    .select("id")
    .single();

  if (error !== null) {
    throw new Error(error.message);
  }
  if (data === null || typeof data.id !== "string") {
    throw new Error("Supabase did not return a saved pattern id.");
  }

  return { patternId: data.id };
}

export async function createPatternShare(
  supabase: SupabaseClient,
  patternId: string,
  createdBy: string
): Promise<{ shareId: string }> {
  const payload = createSharePayload(patternId, createdBy);
  const { data, error } = await supabase.from("pattern_shares").insert({
    pattern_id: payload.patternId,
    created_by: payload.createdBy,
    access: payload.access
  }).select("id").single();

  if (error !== null) {
    throw new Error(error.message);
  }
  if (data === null || typeof data.id !== "string") {
    throw new Error("Supabase did not return a share id.");
  }

  return { shareId: data.id };
}
