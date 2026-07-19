/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import DashboardLayout from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Scan, Search, AlertTriangle, CheckCircle, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import BarcodeScanner from '@/components/barcode-scanner';
import RewardsNotification, {
  useRewardsNotification,
} from '@/components/rewards-notification';

interface ProductData {
  barcode: string;
  product: string;
  co2_emission: number;
  category?: string;
  confidence?: 'high' | 'medium' | 'low';
  calculation?: string;
  brand?: string;
  description?: string;
  sustainabilityScore?: string;
  image?: string;
  transportDistance?: string;
  certifications?: string[];
  packaging?: {
    material: string;
    recyclable: boolean;
    biodegradable: boolean;
    inferred?: boolean;
  };
  source?: string;
}

export default function ScanPage() {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLock, setScanLock] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { updateUserStats, user } = useAuth();
  const { toast } = useToast();
  const { notification, showNotification, dismissNotification } =
    useRewardsNotification();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      setIsScanning(true);
    } catch (error) {
      toast({
        title: 'Camera access denied',
        description: 'Please allow camera access to scan barcodes.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const handleScan = async (scanned?: string) => {
    if (scanLock) return;
    setScanLock(true);

    const actualBarcode = (scanned || barcode).trim();
    if (!actualBarcode) {
      toast({
        title: 'Please enter a barcode',
        description: 'Enter a valid barcode to scan the product.',
        variant: 'destructive',
      });
      setScanLock(false);
      return;
    }

    setIsLoading(true);
    setImageError(false);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email ?? '',
        },
        body: JSON.stringify({
          barcode: actualBarcode,
          timezoneOffset: new Date().getTimezoneOffset(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error || !data.productName)
        throw new Error('Product not found in API');

      setProduct({
        barcode: actualBarcode,
        product: data.productName,
        brand: data.brand || 'Unknown',
        category: data.category || 'Unknown',
        co2_emission: parseFloat(data.carbonEstimate),
        confidence: data.confidence,
        calculation: data.calculation,
        sustainabilityScore: 'B',
        description: `${data.calculation || 'Calculated using scientific data'}`,
        image: data.image || null,
        certifications: [],
        packaging: data.packaging || {
          material: 'Unknown',
          recyclable: false,
          biodegradable: false,
        },
        transportDistance: 'Unknown',
        source: data.source || 'Local Calculator',
      });

      toast({
        title: 'Product found!',
        description: `Carbon impact: ${data.carbonEstimate}kg CO₂ (${data.confidence} confidence)`,
      });

      if (data.rewards) {
        const {
          pointsEarned,
          pointsType,
          leveledUp,
          newAchievements,
          streakProtected,
          milestone,
        } = data.rewards;
        if (pointsEarned > 0) {
          showNotification({
            type: 'points',
            message: `Great job! You earned ${pointsEarned} reward points for scanning this product.`,
            points: pointsEarned,
            pointsType,
          });
        }
        if (streakProtected) {
          setTimeout(() => {
            showNotification({
              type: 'achievement',
              message: `🛡️ Streak saved! You used a streak protector to keep your streak alive.`,
              points: 0,
            });
          }, 1500);
        }
        if (milestone) {
          setTimeout(
            () => {
              showNotification({
                type: 'achievement',
                message: `🔥 Milestone Reached: ${milestone} Day Streak!`,
                points: 0,
              });
            },
            streakProtected ? 3000 : 1500
          );
        }
        if (leveledUp) {
          setTimeout(
            () => {
              showNotification({
                type: 'level_up',
                message: `Congratulations! You've reached level ${data.rewards.level}!`,
                level: data.rewards.level,
              });
            },
            (streakProtected ? 3000 : 1500) + (milestone ? 1500 : 0) + 500
          );
        }
        if (newAchievements?.length) {
          newAchievements.forEach((achievement: any, index: number) => {
            setTimeout(
              () => {
                showNotification({
                  type: 'achievement',
                  message: `Achievement unlocked: ${achievement.name}!`,
                  points: achievement.points,
                });
              },
              3000 +
                (streakProtected ? 1500 : 0) +
                (milestone ? 1500 : 0) +
                index * 1500
            );
          });
        }
      }

      updateUserStats?.(parseFloat(data.carbonEstimate));
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Could not find product in API or local data.',
        variant: 'destructive',
      });
      setProduct(null);
    } finally {
      setIsLoading(false);
      setScanLock(false);
    }
  };

  const getSustainabilityColor = (score: string) => {
    switch (score) {
      case 'A':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'B+':
      case 'B':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'C':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'D':
      case 'F':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCarbonImpact = (footprint: number) => {
    if (footprint < 1)
      return { level: 'Low', icon: CheckCircle, color: 'text-green-600' };
    if (footprint < 5)
      return { level: 'Medium', icon: AlertTriangle, color: 'text-yellow-600' };
    return { level: 'High', icon: AlertTriangle, color: 'text-red-600' };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-cyan-900">Scan Product</h1>
          <p className="text-gray-600 mt-2">
            Enter or scan a barcode to check the recyclability, carbon footprint
            and your sustainability score.
          </p>
        </div>

        <Card className="bg-cyan-100 border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-700">
              <Scan className="h-5 w-5" /> Product Scanner
            </CardTitle>
            <CardDescription className="text-gray-600">
              Enter a barcode manually, use your camera to scan, or try the demo
              barcodes below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barcode" className="text-slate-900 font-medium">
                Barcode
              </Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  placeholder="Enter barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && !scanLock && handleScan()
                  }
                />
                <Button onClick={() => setIsScanning(true)} variant="outline">
                  <Camera className="h-4 w-4" />
                </Button>
                <Button onClick={() => handleScan()} disabled={isLoading}>
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {product && (
          <Card className="bg-cyan-100 border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-cyan-700">
                <span>{product.product}</span>
                <div className="flex gap-2">
                  <Badge
                    className={`${getSustainabilityColor(product.sustainabilityScore!)} border`}
                  >
                    Score: {product.sustainabilityScore}
                  </Badge>
                  {product.confidence && (
                    <Badge
                      variant="outline"
                      className={
                        product.confidence === 'high'
                          ? 'border-green-600 text-green-700 bg-green-50'
                          : product.confidence === 'medium'
                            ? 'border-yellow-600 text-yellow-800 bg-yellow-50'
                            : 'border-red-600 text-red-700 bg-red-50'
                      }
                    >
                      {product.confidence} confidence
                    </Badge>
                  )}
                </div>
              </CardTitle>
              <CardDescription className="text-cyan-900 font-medium">
                {product.brand} • {product.category}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-center justify-center">
                  {product.image && !imageError ? (
                    <img
                      src={product.image}
                      alt={product.product}
                      className="rounded-xl object-contain max-h-56 w-full shadow-sm border border-cyan-200 bg-white p-2"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="rounded-xl border border-cyan-200 bg-white/60 flex flex-col items-center justify-center gap-2 h-48 w-full text-cyan-600">
                      <Scan className="h-10 w-10 opacity-40" />
                      <span className="text-sm font-medium text-cyan-700">
                        No image available
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-cyan-900">
                      Carbon Footprint
                    </h3>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const impact = getCarbonImpact(product.co2_emission);
                        return (
                          <>
                            <impact.icon
                              className={`h-5 w-5 ${impact.color}`}
                            />
                            <span className="text-2xl font-bold text-cyan-900">
                              {product.co2_emission} kg CO₂
                            </span>
                            <Badge variant="outline" className={impact.color}>
                              {impact.level} Impact
                            </Badge>
                          </>
                        );
                      })()}
                    </div>
                    {product.calculation && (
                      <p className="text-sm text-cyan-800 mt-2">
                        Calculation: {product.calculation}
                      </p>
                    )}
                    {product.source && (
                      <p className="text-xs text-cyan-700/80 mt-1 font-medium">
                        Source: {product.source}
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2 text-cyan-900">
                      ♻️ Packaging Info
                    </h4>
                    {product.packaging ? (
                      <div className="space-y-1 text-sm text-cyan-900">
                        <div className="flex justify-between">
                          <span>Material:</span>
                          <span className="font-medium text-cyan-900">
                            {product.packaging.material}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recyclable:</span>
                          <span className="font-medium text-cyan-900">
                            {product.packaging.recyclable ? '✅ Yes' : '❌ No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Biodegradable:</span>
                          <span className="font-medium text-cyan-900">
                            {product.packaging.biodegradable
                              ? '✅ Yes'
                              : '❌ No'}
                          </span>
                        </div>
                        {product.packaging.inferred && (
                          <p className="text-yellow-800 text-xs mt-1 font-medium">
                            ⚠️ Estimated based on product category
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-cyan-800">
                        No packaging data available.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 text-cyan-900">Description</h4>
                <p className="text-cyan-800">{product.description}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isScanning && (
          <BarcodeScanner
            onScan={(scannedBarcode) => {
              if (!scanLock) {
                setBarcode(scannedBarcode);
                setIsScanning(false);
                handleScan(scannedBarcode);
              }
            }}
            onClose={() => setIsScanning(false)}
          />
        )}
      </div>

      <RewardsNotification
        notification={notification}
        onDismiss={dismissNotification}
      />
    </DashboardLayout>
  );
}
