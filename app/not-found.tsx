import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Leaf, Home, ScanLine } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex items-center justify-center rounded-full bg-green-100 p-6">
        <Leaf className="h-12 w-12 text-green-600" />
      </div>

      <div className="space-y-2">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-foreground">
          This page wandered off the trail
        </h2>
        <p className="max-w-md text-muted-foreground">
          We couldn&apos;t find the page you&apos;re looking for. It may have
          been moved, renamed, or never existed in the first place.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/scan">
            <ScanLine className="mr-2 h-4 w-4" />
            Scan a Product
          </Link>
        </Button>
      </div>
    </div>
  );
}
