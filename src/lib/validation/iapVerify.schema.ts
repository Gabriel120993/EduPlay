import { z } from "zod";

import { isPremiumIapProductId } from "../../constants/premiumIap";
import { formatZodError } from "./schemas";

export const verifyPremiumIapBodySchema = z
  .object({
    platform: z
      .string()
      .transform((s) => s.trim().toLowerCase())
      .pipe(z.enum(["ios", "android"])),
    productId: z.string().trim().min(1).max(128),
    orderId: z.string().trim().max(128).optional(),
    transactionReceipt: z.string().max(600_000).optional(),
    purchaseToken: z.string().trim().max(16_000).optional(),
    packageName: z.string().trim().max(256).optional(),
  })
  .superRefine((data, ctx) => {
    if (!isPremiumIapProductId(data.productId)) {
      ctx.addIssue({
        code: "custom",
        message: "Producto no válido.",
        path: ["productId"],
      });
    }
    if (data.platform === "ios") {
      const tr = data.transactionReceipt?.trim();
      if (!tr) {
        ctx.addIssue({
          code: "custom",
          message: "transactionReceipt es obligatorio en iOS.",
          path: ["transactionReceipt"],
        });
      }
    } else if (!data.purchaseToken?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "purchaseToken es obligatorio en Android.",
        path: ["purchaseToken"],
      });
    }
  });

export type VerifyPremiumIapBody = z.infer<typeof verifyPremiumIapBodySchema>;

export function parseVerifyPremiumIapBody(body: unknown): { ok: true; data: VerifyPremiumIapBody } | { ok: false; error: string } {
  const r = verifyPremiumIapBodySchema.safeParse(body);
  if (!r.success) {
    return { ok: false, error: formatZodError(r.error) };
  }
  return { ok: true, data: r.data };
}
