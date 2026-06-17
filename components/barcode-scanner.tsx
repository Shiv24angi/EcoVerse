'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Camera, X, Flashlight, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    'environment'
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // Use useMemo so the ZXing reader instance is preserved across renders
  const codeReader = useMemo(() => new BrowserMultiFormatReader(), []);

  // Stabilize startCamera with useCallback to prevent infinite hook triggers
  const startCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const mediaStream =
        await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch {
      toast({
        title: 'Camera access denied',
        description: 'Please allow camera access to scan barcodes.',
        variant: 'destructive',
      });
    }
  }, [facingMode, toast]);

  // Stabilize stopCamera to cleanly drop stream allocations
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Handle live decoding from current viewport
  const simulateScan = useCallback(async () => {
    if (videoRef.current) {
      try {
        const result = await codeReader.decodeOnceFromVideoElement(
          videoRef.current
        );
        if (result && result.getText()) {
          const barcode = result.getText();
          onScan(barcode);
        }
      } catch (error) {
        if ((error as Error)?.name !== 'NotFoundException') {
          toast({
            title: 'Scanning failed',
            description: (error as Error).message,
            variant: 'destructive',
          });
        }
      }
    }
  }, [codeReader, onScan, toast]);

  // Hook 1: Safely controls camera instance lifespan
  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]); 
  // We explicitly run only when facingMode toggles, ignoring active stream updates

  // Hook 2: Handles interval automation loop
  useEffect(() => {
    const interval = setInterval(() => {
      simulateScan();
    }, 3000);

    return () => clearInterval(interval);
  }, [simulateScan]);

  const toggleFlash = async () => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
        torch?: boolean;
      };

      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !isFlashOn } as MediaTrackConstraintSet],
          });
          setIsFlashOn(!isFlashOn);
        } catch {
          toast({
            title: 'Flash not available',
            description: "Your device doesn't support camera flash.",
            variant: 'destructive',
          });
        }
      }
    }
  };

  const switchCamera = () => {
    setFacingMode(facingMode === 'user' ? 'environment' : 'user');
  };

  const enterBarcodeManually = () => {
    const input = prompt('Enter barcode manually:');
    if (input && input.trim()) {
      onScan(input.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <Card className="dark-card mx-4 w-full max-w-md border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Scan Barcode</CardTitle>
              <CardDescription className="text-gray-400">
                Position the barcode within the frame
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <video
              ref={videoRef}
              className="h-64 w-full rounded-lg bg-black object-cover"
              autoPlay
              playsInline
              muted
            />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-24 w-48 rounded-lg border-2 border-green-400">
                <div className="absolute -left-1 -top-1 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-green-400"></div>
                <div className="absolute -right-1 -top-1 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-green-400"></div>
                <div className="absolute -bottom-1 -left-1 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-green-400"></div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-green-400"></div>
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <div className="absolute h-0.5 w-full animate-pulse bg-green-400"></div>
                </div>
              </div>
            </div>

            <div className="absolute right-2 top-2 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleFlash}
                className={`${isFlashOn ? 'bg-yellow-600' : 'bg-gray-700'}`}
              >
                <Flashlight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={switchCamera}
                className="bg-gray-700"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-400">
              Align the barcode within the green frame and it will be scanned
              automatically
            </p>

            <div className="flex gap-2">
              <Button onClick={simulateScan} className="flex-1">
                <Camera className="mr-2 h-4 w-4" />
                Scan Now
              </Button>
              <Button
                onClick={enterBarcodeManually}
                variant="outline"
                className="flex-1"
              >
                Enter Manually
              </Button>
            </div>

            <Button variant="ghost" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}