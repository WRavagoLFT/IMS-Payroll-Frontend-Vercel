import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-6 text-center">
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
            <p className="text-sm text-muted-foreground">
              The page you are looking for does not exist.
            </p>
            <Link href="/">
              <Button variant="default">Go Home</Button>
            </Link>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
