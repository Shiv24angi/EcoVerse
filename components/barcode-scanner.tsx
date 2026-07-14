'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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

interface TorchCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

interface TorchConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const streamRef = useRef<MediaStream | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    'environment'
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const isScanningRef = useRef(false);
  const isActiveRef = useRef(true);
  const { toast } = useToast();

  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  if (!codeReaderRef.current) {
    codeReaderRef.current = new BrowserMultiFormatReader();
  }

  const cleanupCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    cleanupCamera();
  }, [cleanupCamera]);

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

      if (!isActiveRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (error) {
      if (!isActiveRef.current) return;

      toast({
        title: 'Camera access denied',
        description: 'Please allow camera access to scan barcodes.',
        variant: 'destructive',
      });
    }
  }, [facingMode, toast]);

  const handleScan = useCallback(
    (barcode: string) => {
      onScan(barcode);
    },
    [onScan]
  );

  const simulateScan = useCallback(async () => {
    if (isScanningRef.current) return;
    if (!videoRef.current || !streamRef.current || !codeReaderRef.current)
      return;

    isScanningRef.current = true;
    try {
      const result = await codeReaderRef.current.decodeOnceFromVideoElement(
        videoRef.current
      );
      if (result && result.getText()) {
        const barcode = result.getText();
        handleScan(barcode);
      }
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'NotFoundException') {
        toast({
          title: 'Scanning failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    } finally {
      isScanningRef.current = false;
    }
  }, [handleScan, toast]);

  // Hook 1: Handles camera initialization lifecycle
  useEffect(() => {
    isActiveRef.current = true;

    const initializeCamera = async () => {
      await startCamera();
    };

    void initializeCamera();

    return () => {
      isActiveRef.current = false;
      cleanupCamera();
    };
  }, [cleanupCamera, startCamera]);

  // Hook 2: Handles the scanning interval orchestration
  useEffect(() => {
    const interval = setInterval(() => {
      simulateScan();
    }, 3000);

    return () => clearInterval(interval);
  }, [simulateScan]);

  const toggleFlash = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as TorchCapabilities;

      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !isFlashOn } as TorchConstraintSet],
          });
          setIsFlashOn(!isFlashOn);
        } catch (error) {
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
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const enterBarcodeManually = () => {
    const input = prompt('Enter barcode manually:');
    if (input && input.trim()) {
      handleScan(input.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 dark-card border-gray-700">
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
              data-testid="barcode-video"
              className="w-full h-64 bg-black rounded-lg object-cover"
              autoPlay
              playsInline
              muted
            />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-48 h-24 border-2 border-green-400 rounded-lg">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-green-400 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-green-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-green-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-green-400 rounded-br-lg"></div>
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <div className="absolute w-full h-0.5 bg-green-400 animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className="absolute top-2 right-2 flex gap-2">
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

          <div className="text-center space-y-4">
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
