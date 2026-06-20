import { Suspense } from 'react';
import VerifyForm from './page.inner';

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
