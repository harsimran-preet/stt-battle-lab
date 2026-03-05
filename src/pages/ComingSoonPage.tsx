import { Construction } from 'lucide-react';

export default function ComingSoonPage() {
  return (
    <div className="flex h-full min-h-[500px] flex-col items-center justify-center text-center p-8">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Coming Soon</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This page is under construction. Something great is on the way.
      </p>
    </div>
  );
}
