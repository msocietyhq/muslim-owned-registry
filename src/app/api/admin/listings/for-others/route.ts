import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, json, requireAdmin } from "@/lib/http";
import { createListingForOtherOwner } from "@/lib/listing-for-others";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = z
      .object({
        ownerEmail: z.string().email(),
        displayName: z.string().max(80).optional(),
        uen: z.string().max(20).optional().default(""),
        registeredName: z.string().max(160).optional().default(""),
        brandName: z.string().min(2).max(120),
        contactEmail: z.string().email().optional(),
        whatsapp: z.string().max(40).optional().nullable(),
        whatsappTemplate: z.string().max(500).optional().nullable(),
        summary: z.string().max(280).optional().default(""),
        description: z.string().max(8000).optional().default(""),
        urls: z
          .array(z.object({ url: z.string().url(), label: z.string().min(1).max(40) }))
          .max(8)
          .optional()
          .default([]),
        tagIds: z.array(z.string()).max(12).optional().default([]),
        photos: z.array(z.string()).max(5).optional().default([]),
        lat: z.number().nullable().optional(),
        lng: z.number().nullable().optional(),
        address: z.string().max(200).optional().default(""),
        verificationType: z.enum(["uen_document", "linkedin"]).optional(),
        linkedinUrl: z.string().max(300).optional().nullable(),
        uenStoragePath: z.string().max(500).optional().nullable(),
        primaryColor: z.string().max(20).optional().nullable(),
        secondaryColor: z.string().max(20).optional().nullable(),
      })
      .parse(await request.json());
    const result = await createListingForOtherOwner(admin, body);
    return json({
      business: result.business,
      ownerEmail: result.ownerEmail,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: error.issues[0]?.message || "Check the form." }, 400);
    }
    return errorResponse(error);
  }
}
