import { Suspense } from 'react';
import ResetPasswordForm from './page.inner';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
