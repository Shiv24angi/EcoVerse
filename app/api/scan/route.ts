import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import mongoose from "mongoose"
import { calculateCarbonFootprint } from "@/lib/carbon-calculator"
import {
  calculateScanPoints,
  calculateLevel,
  checkAchievements,
  calculateMonthlyBonus,
  confirmPendingPoints,
  getUserPointsSummary,
} from "@/lib/rewards-system"
import { inferPackaging } from "@/lib/packaging-inference"

interface PackagingProduct {
  packaging?: string
  packaging_tags?: string[]
}

interface LocalBarcode {
  barcode: string
  product: string
  packaging?: string
  co2_emission?: number
  image?: string
}
function parsePackaging(product: PackagingProduct): { material: string; recyclable: boolean; biodegradable: boolean; inferred: boolean } {
  const material = product.packaging || "Unknown";
  const tags = (product.packaging_tags || []).map((t: string) => t.toLowerCase());
  
  let recyclable = false;
  let biodegradable = false;
  
  const recyclableMaterials = ["glass", "paper", "cardboard", "aluminium", "aluminum", "pet", "recyclable", "verre", "carton", "bouteille", "bottle", "can", "boîte", "pot-en-verre"];
  const biodegradableMaterials = ["paper", "cardboard", "biodegradable", "compostable", "carton", "papier"];
  
  const materialLower = material.toLowerCase();
  if (recyclableMaterials.some(m => materialLower.includes(m) || tags.some((t: string) => t.includes(m)))) {
    recyclable = true;
  }
  if (biodegradableMaterials.some(m => materialLower.includes(m) || tags.some((t: string) => t.includes(m)))) {
    biodegradable = true;
  }
  
  return {
    material,
    recyclable,
    biodegradable,
    inferred: false
  };
}

export async function POST(req: Request) {
  const userEmail = req.headers.get("x-user-email")

const token = cookieStore.get("auth_token")?.value

if (!token) {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  )
}

const decoded = await verifyToken(token)

if (!decoded || !decoded.email) {
  return NextResponse.json(
    { error: "Invalid token" },
    { status: 401 }
  )
}

const userEmail = decoded.email

  const { barcode } = await req.json()

  if (!barcode) {
    return NextResponse.json({ error: "Barcode missing" }, { status: 400 })
  }

  let productData: {
    productName: string;
    brand: string;
    image: string;
    ingredients: string;
    categories: string[];
    packaging: { material: string; recyclable: boolean; biodegradable: boolean; inferred: boolean };
    ecoscoreGrade: string;
    carbonEstimate: number;
    category: string;
    confidence: "high" | "medium" | "low";
    calculation: string;
  } | null = null;

  try {
    console.log(`🔍 Fetching product data for barcode: ${barcode}`);
    const controller = new AbortController()

const timeout = setTimeout(() => {
  controller.abort()
}, 5000)

const response = await fetch(
  `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
   {
    signal: controller.signal,
    headers: {
      "User-Agent": "EcoVerse/1.0",
      Accept: "application/json",
    },
    cache: "no-store",
  }
)

clearTimeout(timeout)
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const categories = (p.categories_tags || []).map((cat: string) => cat.replace("en:", ""));
        const hasPackagingData =
           (p.packaging && p.packaging !== "Unknown") ||
           (p.packaging_tags?.length ?? 0) > 0

        const packaging = hasPackagingData
          ? parsePackaging(p)
          : inferPackaging(categories)
        const carbonData = calculateCarbonFootprint(p.product_name || "", p.brands);

        productData = {
          productName: p.product_name || "Unknown Product",
          brand: p.brands || "Unknown",
         image:
  p.selected_images?.front?.display?.en ||
  p.selected_images?.front?.display?.fr ||
  p.image_front_url ||
  p.image_front_small_url ||
  p.image_thumb_url ||
  "/placeholder.svg",
          ingredients: p.ingredients_text || "Not available",
          categories,
          packaging,
          ecoscoreGrade: p.ecoscore_grade || "unknown",
          carbonEstimate: carbonData.carbonFootprint,
          category: carbonData.category,
          confidence: carbonData.confidence,
          calculation: carbonData.calculation
        };
      } else {
        console.log(`⚠️ OpenFoodFacts returned status ${data.status} for barcode ${barcode}`);
      }
    } else {
      console.error(`🔥 OpenFoodFacts API error status: ${response.status}`);
    }
  } catch (fetchError) {
    if (
  fetchError instanceof Error &&
  fetchError.name === "AbortError"
) {
  console.error("⏱ OpenFoodFacts request timed out")
}

console.error(
  "🔥 Error fetching product from OpenFoodFacts:",
  fetchError
)
  }

  if (!productData) {
    console.log(`ℹ️ Falling back to local reference data for barcode: ${barcode}`);
    let localProduct: LocalBarcode | null = null;
    try {
      const filePath = path.join(process.cwd(), "public", "barcode-data.json");
      const fileContents = fs.readFileSync(filePath, "utf8");
      const localBarcodes = JSON.parse(fileContents);
     localProduct = localBarcodes.find(
  (b: LocalBarcode) => b.barcode === barcode
);
    } catch (fsError) {
      console.error("🔥 Error reading local barcode database:", fsError);
    }

    if (localProduct) {
      const carbonData = calculateCarbonFootprint(localProduct.product, "Unknown");
      const packagingText = localProduct.packaging?.toLowerCase() || ""

      const resolvedCarbon =
        localProduct.co2_emission ??
        carbonData.carbonFootprint

const isRecyclable = [
  "glass",
  "paper",
  "cardboard",
  "tetra",
  "aluminum",
  "aluminium",
].some((m) => packagingText.includes(m))

const isBiodegradable = [
  "paper",
  "cardboard",
  "loose",
].some((m) => packagingText.includes(m))
      productData = {
        productName: localProduct.product,
        brand: "Unknown",
       image: localProduct.image || "/placeholder.svg",
        ingredients: "Not available",
        categories: [],
        packaging: {
          material: localProduct.packaging || "Unknown",
          recyclable: isRecyclable,
          biodegradable: isBiodegradable,
          inferred: false
        },
        ecoscoreGrade: "unknown",
        carbonEstimate: resolvedCarbon,
        category: carbonData.category,
        confidence: "medium",
        calculation: `Local barcode database match. Carbon footprint: ${resolvedCarbon} kg CO₂`
      };
    } else {
     return NextResponse.json(
  { error: "Product not found in API or local database" },
  { status: 404 }
)
    }
  }

  const carbonEstimate = productData.carbonEstimate;

  try {
    await dbConnect()

    const user = await User.findOne({ email: userEmail })

    if (!user) {
      console.error("❌ No user found with email:", userEmail)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isFirstScan = (user.totalScanned ?? 0) === 0
    const streakCount = user.streakCount ?? 0
    const totalScans = user.totalScanned ?? 0

    const pointsData = calculateScanPoints
      ? calculateScanPoints(carbonEstimate, isFirstScan, streakCount, totalScans)
      : { points: 0, reasons: [], isConfirmed: false }

    const isConfirmed = pointsData.isConfirmed
    const pointsEarned = pointsData.points

    // ✅ Update points directly in DB
    const updateFields: Record<string, unknown> = {
      $inc: {
        monthlyCarbon: carbonEstimate,
        totalScanned: 1,
        ...(isConfirmed
        ? { confirmedPoints: pointsEarned }
        : { unconfirmedPoints: pointsEarned })
      },
      $push: {
        scans: {
          productName: productData.productName,
          carbonEstimate: carbonEstimate,
          category: productData.category,
          confidence: productData.confidence,
          barcode: barcode,
          date: new Date()
        }
      },
      $set: {
        updatedAt: new Date()
      }
    }

    await User.updateOne({ email: userEmail }, updateFields)

    // ✅ Refetch updated user
    const updatedUser = await User.findOne({ email: userEmail })

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to re-fetch user" }, { status: 500 })
    }

    const oldLevel = user.level || 1
    const levelData = calculateLevel ? calculateLevel(updatedUser) : { level: oldLevel }
    const earnedAchievements = checkAchievements ? checkAchievements(updatedUser) : []
    const monthlyBonus = calculateMonthlyBonus ? calculateMonthlyBonus(updatedUser) : 0
    const pointsSummary = getUserPointsSummary(updatedUser)

    // ✅ Sync reward fields
    updatedUser.level = levelData.level
    updatedUser.achievements = earnedAchievements
    updatedUser.confirmedPoints =
    updatedUser.confirmedPoints || 0

    updatedUser.unconfirmedPoints =
    updatedUser.unconfirmedPoints || 0
    updatedUser.rewardPoints = updatedUser.confirmedPoints + updatedUser.unconfirmedPoints
    updatedUser.totalPointsEarned = updatedUser.rewardPoints

    await updatedUser.save()

    console.log("✅ Final Points Synced:", {
      confirmedPoints: updatedUser.confirmedPoints,
      unconfirmedPoints: updatedUser.unconfirmedPoints,
      rewardPoints: updatedUser.rewardPoints,
      totalPointsEarned: updatedUser.totalPointsEarned
    })

    return NextResponse.json({
      // Normalized shape for frontend consumption
      name: productData.productName,
      brand: productData.brand,
      image: productData.image,
      ingredients: productData.ingredients,
      categories: productData.categories,
      packaging: productData.packaging,
      ecoscoreGrade: productData.ecoscoreGrade,
      carbonEstimate: carbonEstimate.toFixed(2),

      // Legacy fields for backward compatibility
      productName: productData.productName,
      category: productData.category,
      confidence: productData.confidence,
      calculation: productData.calculation,
      rewards: {
        pointsEarned,
        pointsType: isConfirmed ? 'confirmed' : 'unconfirmed',
        reasons: pointsData.reasons,
        pointsSummary,
        level: updatedUser.level,
        leveledUp: levelData.level > oldLevel,
        newAchievements: earnedAchievements,
        streakCount: updatedUser.streakCount,
        monthlyBonus,
        sustainabilityTier:
          updatedUser.monthlyCarbon < 10 && updatedUser.totalScanned >= 15 ? 'Platinum' :
            updatedUser.monthlyCarbon < 20 && updatedUser.totalScanned >= 10 ? 'Gold' :
              updatedUser.monthlyCarbon < 30 && updatedUser.totalScanned >= 5 ? 'Silver' :
                updatedUser.monthlyCarbon < 40 ? 'Bronze' : 'Beginner',
        pendingConfirmationInfo: (() => {
          const confirmationData = confirmPendingPoints
            ? confirmPendingPoints(updatedUser)
            : { confirmedPoints: 0, confirmedTransactions: [] }

          return confirmationData.confirmedPoints > 0
            ? {
              pointsConfirmed: confirmationData.confirmedPoints,
              transactionsConfirmed: confirmationData.confirmedTransactions.length
            }
            : null
        })()
      }
    })
  } catch (dbError) {
    console.error("🔥 Failed to update user stats:", dbError)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }
}

