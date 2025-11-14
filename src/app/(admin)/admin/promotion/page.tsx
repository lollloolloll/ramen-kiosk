'use client';

import { Separator } from '@/components/ui/separator';

export default function PromotionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Promotion Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage promotional content and campaigns.
        </p>
      </div>
      <Separator />
      {/* Promotion content goes here */}
      <p>Promotion content will be added here.</p>
    </div>
  );
}